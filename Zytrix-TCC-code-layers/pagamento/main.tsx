import React, { useEffect, useMemo, useState } from "react"

import { initializeApp, getApps } from "firebase/app"

import {
    getAuth,
    onAuthStateChanged,
    User,
} from "firebase/auth"

import {
    getFirestore,
    collection,
    doc,
    getDoc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
    setDoc,
} from "firebase/firestore"


const firebaseConfig = {
    apiKey: "AIzaSyDLUogDD_G98mDO7SqEA_U6JX1HlRuseUE",
    authDomain: "zytrix-ca4f2.firebaseapp.com",
    projectId: "zytrix-ca4f2",
    storageBucket: "zytrix-ca4f2.firebasestorage.app",
    messagingSenderId: "538535719632",
    appId: "1:538535719632:web:b8a5de998ca8d1db00a4d5",
    measurementId: "G-422Y8YEZYX",
}

const app =
    getApps().length === 0
        ? initializeApp(firebaseConfig)
        : getApps()[0]

const auth = getAuth(app)
const db = getFirestore(app)

const BONUS_INICIAL = 500
const STORAGE_PACKAGE_KEY = "zytrixSelectedCoinPackage"


type CoinPackage = {
    id: string
    coins: number
    priceCents: number
    label: string
}

type PaymentMethod = "pix" | "card"

const pacotes: CoinPackage[] = [
    { id: "zy100", coins: 100, priceCents: 490, label: "Pacote Inicial" },
    { id: "zy500", coins: 500, priceCents: 1490, label: "Pacote Stream" },
    { id: "zy1200", coins: 1200, priceCents: 2990, label: "Pacote Plus" },
    { id: "zy2500", coins: 2500, priceCents: 4990, label: "Pacote Ultra" },
]


function formatarMoeda(valorEmCentavos: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(valorEmCentavos / 100)
}


async function garantirCarteira(user: User) {
    const walletRef = doc(db, "wallets", user.uid)

    await runTransaction(db, async transaction => {
        const walletSnap = await transaction.get(walletRef)

        if (walletSnap.exists()) {
            return
        }

        transaction.set(walletRef, {
            uid: user.uid,
            balance: BONUS_INICIAL,
            totalSent: 0,
            totalReceived: 0,
            lastTransactionId: "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        })
    })
}


export default function PagamentoZyCoins() {
    const [usuario, setUsuario] = useState<User | null>(null)
    const [saldo, setSaldo] = useState(0)
    const [pacoteId, setPacoteId] = useState("")
    const [metodo, setMetodo] = useState<PaymentMethod>("pix")
    const [admin, setAdmin] = useState(false)
    const [carregando, setCarregando] = useState(true)
    const [processando, setProcessando] = useState(false)
    const [erro, setErro] = useState("")
    const [sucesso, setSucesso] = useState("")
    const [pedidoId, setPedidoId] = useState("")

    useEffect(() => {
        try {
            setPacoteId(localStorage.getItem(STORAGE_PACKAGE_KEY) ?? "")
        } catch {}

        const unsubscribe = onAuthStateChanged(auth, async user => {
            setUsuario(user)
            setAdmin(false)

            if (!user) {
                setCarregando(false)
                return
            }

            try {
                await garantirCarteira(user)

                const adminSnap = await getDoc(doc(db, "admins", user.uid))
                setAdmin(
                    adminSnap.exists() && adminSnap.data().active === true
                )
            } catch (error) {
                console.error(error)
                setErro("Não foi possível preparar o pagamento.")
            }

            setCarregando(false)
        })

        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (!usuario) {
            return
        }

        const unsubscribe = onSnapshot(
            doc(db, "wallets", usuario.uid),
            snapshot => {
                if (!snapshot.exists()) {
                    setSaldo(0)
                    return
                }

                setSaldo(Math.max(0, Number(snapshot.data().balance ?? 0)))
            }
        )

        return () => unsubscribe()
    }, [usuario])

    const pacote = useMemo(
        () => pacotes.find(item => item.id === pacoteId) ?? null,
        [pacoteId]
    )

    async function criarPedido() {
        if (!usuario || !pacote || processando) {
            return
        }

        setProcessando(true)
        setErro("")
        setSucesso("")
        setPedidoId("")

        try {
            const orderRef = doc(collection(db, "zyCoinOrders"))

            if (admin) {
                const walletRef = doc(db, "wallets", usuario.uid)

                await runTransaction(db, async transaction => {
                    const walletSnap = await transaction.get(walletRef)

                    if (!walletSnap.exists()) {
                        throw new Error("Carteira não encontrada.")
                    }

                    const wallet = walletSnap.data()

                    transaction.update(walletRef, {
                        balance:
                            Math.max(0, Number(wallet.balance ?? 0)) +
                            pacote.coins,
                        totalSent: Math.max(0, Number(wallet.totalSent ?? 0)),
                        totalReceived: Math.max(
                            0,
                            Number(wallet.totalReceived ?? 0)
                        ),
                        lastTransactionId: orderRef.id,
                        updatedAt: serverTimestamp(),
                    })

                    transaction.set(orderRef, {
                        uid: usuario.uid,
                        packageId: pacote.id,
                        coins: pacote.coins,
                        priceCents: pacote.priceCents,
                        paymentMethod: metodo,
                        status: "paid",
                        mode: "admin_demo",
                        createdAt: serverTimestamp(),
                        paidAt: serverTimestamp(),
                    })
                })

                setPedidoId(orderRef.id)
                setSucesso(
                    `Pagamento demonstrativo aprovado. ${pacote.coins.toLocaleString("pt-BR")} Zy Coins foram adicionadas à sua carteira.`
                )
            } else {
                await setDoc(orderRef, {
                    uid: usuario.uid,
                    packageId: pacote.id,
                    coins: pacote.coins,
                    priceCents: pacote.priceCents,
                    paymentMethod: metodo,
                    status: "pending",
                    mode: "prototype",
                    createdAt: serverTimestamp(),
                    paidAt: null,
                })

                setPedidoId(orderRef.id)
                setSucesso(
                    "Pedido criado. Nesta versão do TCC o pagamento real ainda não está conectado; por segurança, o navegador não credita Zy Coins sem confirmação do servidor ou de um administrador."
                )
            }
        } catch (error: any) {
            console.error(error)
            setErro(
                error?.message ||
                    "Não foi possível criar o pedido de Zy Coins."
            )
        } finally {
            setProcessando(false)
        }
    }

    if (carregando) {
        return <div style={estado}>Carregando pagamento...</div>
    }

    if (!usuario) {
        return (
            <div style={estadoColuna}>
                <div style={iconeGrande}>◈</div>
                <div style={estadoTitulo}>Entre na sua conta</div>
                <div style={estadoTexto}>
                    O pagamento de Zy Coins só pode ser iniciado por um usuário
                    autenticado.
                </div>
            </div>
        )
    }

    if (!pacote) {
        return (
            <div style={estadoColuna}>
                <div style={iconeGrande}>◈</div>
                <div style={estadoTitulo}>Nenhum pacote selecionado</div>
                <div style={estadoTexto}>
                    Volte para a Loja de Zy Coins, selecione um pacote e depois
                    abra esta página novamente.
                </div>
            </div>
        )
    }

    return (
        <div style={pagina}>
            <div style={cabecalho}>
                <div>
                    <div style={eyebrow}>CHECKOUT ZYTRIX</div>
                    <h1 style={titulo}>Pagamento</h1>
                    <p style={subtitulo}>
                        Confira o pacote escolhido e selecione a forma de
                        pagamento.
                    </p>
                </div>

                <div style={saldoCard}>
                    <div style={saldoLabel}>SALDO ATUAL</div>
                    <div style={saldoValor}>◈ {saldo.toLocaleString("pt-BR")}</div>
                </div>
            </div>

            <div style={layout}>
                <section style={painel}>
                    <div style={secaoEyebrow}>FORMA DE PAGAMENTO</div>
                    <h2 style={secaoTitulo}>Como deseja pagar?</h2>

                    <div style={metodos}>
                        <button
                            type="button"
                            onClick={() => setMetodo("pix")}
                            style={{
                                ...metodoCard,
                                ...(metodo === "pix" ? metodoAtivo : {}),
                            }}
                        >
                            <span style={metodoIcone}>◆</span>
                            <span>
                                <strong style={metodoNome}>PIX</strong>
                                <span style={metodoTexto}>
                                    Confirmação rápida quando houver gateway.
                                </span>
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMetodo("card")}
                            style={{
                                ...metodoCard,
                                ...(metodo === "card" ? metodoAtivo : {}),
                            }}
                        >
                            <span style={metodoIcone}>▣</span>
                            <span>
                                <strong style={metodoNome}>Cartão</strong>
                                <span style={metodoTexto}>
                                    Não coletamos número de cartão nesta versão.
                                </span>
                            </span>
                        </button>
                    </div>

                    <div style={segurancaBox}>
                        <strong style={{ color: "#FFFFFF" }}>
                            Pagamento protegido por arquitetura segura
                        </strong>
                        <span>
                            Um pagamento real deve ser confirmado por um backend
                            ou gateway. O Code Layer nunca recebe chaves secretas
                            nem pode creditar moedas sozinho.
                        </span>
                    </div>

                    {admin && (
                        <div style={adminBox}>
                            <strong>Modo demonstração de administrador ativo</strong>
                            <span>
                                Ao confirmar, o pacote será creditado imediatamente
                                apenas para permitir a demonstração do TCC.
                            </span>
                        </div>
                    )}

                    {erro && <div style={erroBox}>{erro}</div>}
                    {sucesso && (
                        <div style={sucessoBox}>
                            <strong>{sucesso}</strong>
                            {pedidoId && (
                                <span style={{ marginTop: "5px" }}>
                                    Pedido: {pedidoId}
                                </span>
                            )}
                        </div>
                    )}
                </section>

                <aside style={resumoCard}>
                    <div style={resumoLabel}>RESUMO DO PEDIDO</div>
                    <div style={coinIcon}>◈</div>
                    <div style={resumoCoins}>
                        {pacote.coins.toLocaleString("pt-BR")}
                    </div>
                    <div style={resumoNome}>Zy Coins</div>
                    <div style={resumoPacote}>{pacote.label}</div>

                    <div style={divisor} />

                    <div style={linhaResumo}>
                        <span>Pacote</span>
                        <strong>{formatarMoeda(pacote.priceCents)}</strong>
                    </div>
                    <div style={linhaResumo}>
                        <span>Taxa</span>
                        <strong>R$ 0,00</strong>
                    </div>
                    <div style={totalLinha}>
                        <span>Total</span>
                        <strong>{formatarMoeda(pacote.priceCents)}</strong>
                    </div>

                    <button
                        type="button"
                        onClick={criarPedido}
                        disabled={processando || !!pedidoId}
                        style={{
                            ...confirmarBotao,
                            ...(processando || !!pedidoId
                                ? confirmarDesabilitado
                                : {}),
                        }}
                    >
                        {processando
                            ? "PROCESSANDO..."
                            : admin
                              ? "SIMULAR PAGAMENTO APROVADO"
                              : "CRIAR PEDIDO"}
                    </button>

                    <div style={resumoNota}>
                        {admin
                            ? "Apenas administradores conseguem creditar o pacote em modo de demonstração."
                            : "O pedido ficará pendente até uma confirmação segura do pagamento."}
                    </div>
                </aside>
            </div>
        </div>
    )
}


const pagina: React.CSSProperties = {
    width: "100%",
    minHeight: "100%",
    boxSizing: "border-box",
    padding: "26px",
    color: "#FFFFFF",
    fontFamily: "Inter, Arial, sans-serif",
}

const cabecalho: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: "18px",
}

const eyebrow: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "1.3px",
}

const titulo: React.CSSProperties = {
    margin: "7px 0 0",
    fontSize: "32px",
}

const subtitulo: React.CSSProperties = {
    margin: "8px 0 0",
    color: "#8B99AA",
    fontSize: "12px",
}

const saldoCard: React.CSSProperties = {
    minWidth: "190px",
    padding: "15px 18px",
    border: "1px solid #18384A",
    borderRadius: "12px",
    background: "#101824",
}

const saldoLabel: React.CSSProperties = {
    color: "#8B99AA",
    fontSize: "8px",
    fontWeight: 800,
}

const saldoValor: React.CSSProperties = {
    marginTop: "6px",
    color: "#58C8ED",
    fontSize: "22px",
    fontWeight: 900,
}

const layout: React.CSSProperties = {
    marginTop: "22px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 340px)",
    gap: "18px",
}

const painel: React.CSSProperties = {
    padding: "21px",
    border: "1px solid #263244",
    borderRadius: "14px",
    background: "#0D151F",
}

const secaoEyebrow: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "8px",
    fontWeight: 800,
    letterSpacing: "1px",
}

const secaoTitulo: React.CSSProperties = {
    margin: "5px 0 0",
    fontSize: "20px",
}

const metodos: React.CSSProperties = {
    marginTop: "15px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "11px",
}

const metodoCard: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "14px",
    border: "1px solid #263244",
    borderRadius: "11px",
    background: "#101824",
    color: "#FFFFFF",
    textAlign: "left",
    cursor: "pointer",
}

const metodoAtivo: React.CSSProperties = {
    border: "1px solid #58C8ED",
    background: "#101C29",
}

const metodoIcone: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    background: "#142536",
    color: "#58C8ED",
    fontSize: "17px",
    flexShrink: 0,
}

const metodoNome: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
}

const metodoTexto: React.CSSProperties = {
    display: "block",
    marginTop: "3px",
    color: "#7F8DA0",
    fontSize: "9px",
    lineHeight: 1.4,
}

const segurancaBox: React.CSSProperties = {
    marginTop: "17px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    padding: "14px",
    border: "1px solid #263244",
    borderRadius: "10px",
    background: "#101824",
    color: "#7F8DA0",
    fontSize: "10px",
    lineHeight: 1.5,
}

const adminBox: React.CSSProperties = {
    marginTop: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "13px",
    border: "1px solid #1E617B",
    borderRadius: "10px",
    background: "#0C202A",
    color: "#9CDFF5",
    fontSize: "10px",
}

const erroBox: React.CSSProperties = {
    marginTop: "12px",
    padding: "12px",
    border: "1px solid #7F1D1D",
    borderRadius: "10px",
    background: "#2A1014",
    color: "#FDA4AF",
    fontSize: "10px",
}

const sucessoBox: React.CSSProperties = {
    marginTop: "12px",
    display: "flex",
    flexDirection: "column",
    padding: "12px",
    border: "1px solid #155E75",
    borderRadius: "10px",
    background: "#0B222B",
    color: "#A5F3FC",
    fontSize: "10px",
    lineHeight: 1.5,
}

const resumoCard: React.CSSProperties = {
    height: "fit-content",
    padding: "20px",
    border: "1px solid #263244",
    borderRadius: "14px",
    background: "#101824",
}

const resumoLabel: React.CSSProperties = {
    color: "#8B99AA",
    fontSize: "8px",
    fontWeight: 800,
    letterSpacing: "1px",
}

const coinIcon: React.CSSProperties = {
    marginTop: "16px",
    color: "#58C8ED",
    fontSize: "31px",
    fontWeight: 900,
}

const resumoCoins: React.CSSProperties = {
    marginTop: "2px",
    fontSize: "32px",
    fontWeight: 900,
}

const resumoNome: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "11px",
    fontWeight: 800,
}

const resumoPacote: React.CSSProperties = {
    marginTop: "5px",
    color: "#7F8DA0",
    fontSize: "9px",
}

const divisor: React.CSSProperties = {
    height: "1px",
    margin: "17px 0",
    background: "#263244",
}

const linhaResumo: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "8px",
    color: "#8B99AA",
    fontSize: "10px",
}

const totalLinha: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "15px",
    color: "#FFFFFF",
    fontSize: "13px",
}

const confirmarBotao: React.CSSProperties = {
    width: "100%",
    marginTop: "17px",
    padding: "11px 12px",
    border: 0,
    borderRadius: "9px",
    background: "#58C8ED",
    color: "#06111A",
    fontSize: "9px",
    fontWeight: 900,
    cursor: "pointer",
}

const confirmarDesabilitado: React.CSSProperties = {
    opacity: 0.55,
    cursor: "not-allowed",
}

const resumoNota: React.CSSProperties = {
    marginTop: "9px",
    color: "#66758A",
    fontSize: "8px",
    lineHeight: 1.45,
    textAlign: "center",
}

const estado: React.CSSProperties = {
    width: "100%",
    minHeight: "350px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8B99AA",
    fontFamily: "Inter, Arial, sans-serif",
}

const estadoColuna: React.CSSProperties = {
    width: "100%",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontFamily: "Inter, Arial, sans-serif",
}

const iconeGrande: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "42px",
    fontWeight: 900,
}

const estadoTitulo: React.CSSProperties = {
    marginTop: "12px",
    color: "#FFFFFF",
    fontSize: "21px",
    fontWeight: 800,
}

const estadoTexto: React.CSSProperties = {
    maxWidth: "480px",
    marginTop: "7px",
    color: "#8B99AA",
    fontSize: "11px",
    lineHeight: 1.5,
}
