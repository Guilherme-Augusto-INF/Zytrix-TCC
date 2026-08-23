import React, { useEffect, useMemo, useState } from "react"

import { initializeApp, getApps } from "firebase/app"

import {
    getAuth,
    onAuthStateChanged,
    User,
} from "firebase/auth"

import {
    getFirestore,
    doc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
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


type WalletData = {
    uid: string
    balance: number
    totalSent: number
    totalReceived: number
}

type CoinPackage = {
    id: string
    coins: number
    priceCents: number
    label: string
    description: string
    popular?: boolean
}

const pacotes: CoinPackage[] = [
    {
        id: "zy100",
        coins: 100,
        priceCents: 490,
        label: "Pacote Inicial",
        description: "Para mandar seus primeiros apoios.",
    },
    {
        id: "zy500",
        coins: 500,
        priceCents: 1490,
        label: "Pacote Stream",
        description: "Uma boa quantidade para apoiar várias lives.",
        popular: true,
    },
    {
        id: "zy1200",
        coins: 1200,
        priceCents: 2990,
        label: "Pacote Plus",
        description: "Mais Zy Coins para apoiar seus criadores favoritos.",
    },
    {
        id: "zy2500",
        coins: 2500,
        priceCents: 4990,
        label: "Pacote Ultra",
        description: "Para quem quer apoiar muito mais.",
    },
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


export default function LojaZyCoins() {
    const [usuario, setUsuario] = useState<User | null>(null)
    const [wallet, setWallet] = useState<WalletData | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState("")
    const [pacoteSelecionado, setPacoteSelecionado] = useState("")

    useEffect(() => {
        try {
            setPacoteSelecionado(
                localStorage.getItem(STORAGE_PACKAGE_KEY) ?? ""
            )
        } catch {}

        const unsubscribe = onAuthStateChanged(auth, async user => {
            setUsuario(user)

            if (!user) {
                setWallet(null)
                setCarregando(false)
                return
            }

            try {
                await garantirCarteira(user)
                setErro("")
            } catch (error) {
                console.error("Erro ao ativar carteira:", error)
                setErro("Não foi possível carregar sua carteira de Zy Coins.")
            }

            setCarregando(false)
        })

        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (!usuario) {
            return
        }

        const walletRef = doc(db, "wallets", usuario.uid)

        const unsubscribe = onSnapshot(
            walletRef,
            snapshot => {
                if (!snapshot.exists()) {
                    setWallet(null)
                    return
                }

                const data = snapshot.data()

                setWallet({
                    uid: usuario.uid,
                    balance: Math.max(0, Number(data.balance ?? 0)),
                    totalSent: Math.max(0, Number(data.totalSent ?? 0)),
                    totalReceived: Math.max(0, Number(data.totalReceived ?? 0)),
                })
            },
            error => {
                console.error(error)
                setErro("Não foi possível acompanhar o saldo da carteira.")
            }
        )

        return () => unsubscribe()
    }, [usuario])

    const pacoteAtual = useMemo(
        () => pacotes.find(p => p.id === pacoteSelecionado) ?? null,
        [pacoteSelecionado]
    )

    function selecionarPacote(pacote: CoinPackage) {
        try {
            localStorage.setItem(STORAGE_PACKAGE_KEY, pacote.id)
        } catch {}

        setPacoteSelecionado(pacote.id)
    }

    if (carregando) {
        return <div style={estado}>Carregando Zy Coins...</div>
    }

    return (
        <div style={pagina}>
            <section style={hero}>
                <div>
                    <div style={eyebrow}>ZYTRIX • APOIE QUEM CRIA</div>
                    <h1 style={titulo}>Zy Coins</h1>
                    <p style={subtitulo}>
                        Use Zy Coins para apoiar streamers durante as lives.
                        Quanto mais você apoia, mais força dá para os criadores
                        continuarem produzindo conteúdo.
                    </p>
                </div>

                <div style={saldoCard}>
                    <div style={saldoLabel}>SEU SALDO</div>
                    <div style={saldoValor}>
                        ◈ {wallet?.balance.toLocaleString("pt-BR") ?? "0"}
                    </div>
                    <div style={saldoAjuda}>Zy Coins disponíveis</div>
                </div>
            </section>

            {!usuario && (
                <div style={avisoBox}>
                    <strong style={{ color: "#FFFFFF" }}>Entre na sua conta</strong>
                    <span>
                        Você precisa estar logado para ativar sua carteira e
                        selecionar um pacote de Zy Coins.
                    </span>
                </div>
            )}

            {erro && <div style={erroBox}>{erro}</div>}

            <section style={secao}>
                <div style={secaoTopo}>
                    <div>
                        <div style={secaoEyebrow}>PACOTES</div>
                        <h2 style={secaoTitulo}>Escolha suas Zy Coins</h2>
                    </div>

                    <div style={bonusTag}>
                        Bônus inicial: ◈ {BONUS_INICIAL}
                    </div>
                </div>

                <div style={gridPacotes}>
                    {pacotes.map(pacote => {
                        const selecionado = pacoteSelecionado === pacote.id

                        return (
                            <button
                                key={pacote.id}
                                type="button"
                                disabled={!usuario}
                                onClick={() => selecionarPacote(pacote)}
                                style={{
                                    ...pacoteCard,
                                    ...(selecionado ? pacoteCardSelecionado : {}),
                                    ...(!usuario ? pacoteCardDesabilitado : {}),
                                }}
                            >
                                {pacote.popular && (
                                    <div style={popularTag}>MAIS POPULAR</div>
                                )}

                                <div style={pacoteMoeda}>◈</div>
                                <div style={pacoteCoins}>
                                    {pacote.coins.toLocaleString("pt-BR")}
                                </div>
                                <div style={pacoteNome}>{pacote.label}</div>
                                <div style={pacoteDescricao}>
                                    {pacote.description}
                                </div>
                                <div style={pacotePreco}>
                                    {formatarMoeda(pacote.priceCents)}
                                </div>
                                <div
                                    style={
                                        selecionado
                                            ? pacoteBotaoSelecionado
                                            : pacoteBotao
                                    }
                                >
                                    {selecionado ? "✓ SELECIONADO" : "SELECIONAR"}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </section>

            <section style={rodapeCard}>
                <div>
                    <div style={rodapeTitulo}>
                        {pacoteAtual
                            ? `Pacote selecionado: ${pacoteAtual.coins.toLocaleString("pt-BR")} Zy Coins`
                            : "Selecione um pacote para continuar"}
                    </div>
                    <div style={rodapeTexto}>
                        No Preview do Figma Sites, a navegação deve ser feita por
                        um botão nativo do Figma com Page Link para /pagamento.
                        O pacote escolhido já fica salvo para a próxima página.
                    </div>
                </div>

                <div style={precoResumo}>
                    {pacoteAtual
                        ? formatarMoeda(pacoteAtual.priceCents)
                        : "—"}
                </div>
            </section>

            <div style={notaPrototype}>
                A página de pagamento desta versão é demonstrativa. Nenhum dado
                de cartão é coletado e nenhum pagamento real é processado pelo
                Code Layer.
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

const hero: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: "20px",
}

const eyebrow: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1.4px",
}

const titulo: React.CSSProperties = {
    margin: "8px 0 0",
    fontSize: "34px",
    lineHeight: 1,
}

const subtitulo: React.CSSProperties = {
    maxWidth: "650px",
    margin: "13px 0 0",
    color: "#8B99AA",
    fontSize: "13px",
    lineHeight: 1.65,
}

const saldoCard: React.CSSProperties = {
    minWidth: "210px",
    padding: "18px 20px",
    border: "1px solid #18384A",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #101824 0%, #0B121C 100%)",
}

const saldoLabel: React.CSSProperties = {
    color: "#8B99AA",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "1px",
}

const saldoValor: React.CSSProperties = {
    marginTop: "8px",
    color: "#58C8ED",
    fontSize: "26px",
    fontWeight: 900,
}

const saldoAjuda: React.CSSProperties = {
    marginTop: "4px",
    color: "#66758A",
    fontSize: "10px",
}

const avisoBox: React.CSSProperties = {
    marginTop: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    padding: "15px 17px",
    border: "1px solid #394354",
    borderRadius: "12px",
    background: "#101824",
    color: "#8B99AA",
    fontSize: "12px",
}

const erroBox: React.CSSProperties = {
    marginTop: "20px",
    padding: "13px 15px",
    border: "1px solid #7F1D1D",
    borderRadius: "10px",
    background: "#2A1014",
    color: "#FDA4AF",
    fontSize: "12px",
}

const secao: React.CSSProperties = {
    marginTop: "30px",
}

const secaoTopo: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "end",
    justifyContent: "space-between",
    gap: "12px",
}

const secaoEyebrow: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "1px",
}

const secaoTitulo: React.CSSProperties = {
    margin: "4px 0 0",
    fontSize: "22px",
}

const bonusTag: React.CSSProperties = {
    padding: "7px 10px",
    border: "1px solid #19415A",
    borderRadius: "999px",
    background: "#0C1721",
    color: "#58C8ED",
    fontSize: "10px",
    fontWeight: 700,
}

const gridPacotes: React.CSSProperties = {
    marginTop: "16px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "14px",
}

const pacoteCard: React.CSSProperties = {
    position: "relative",
    minHeight: "285px",
    padding: "22px 18px 18px",
    border: "1px solid #263244",
    borderRadius: "15px",
    background: "#101824",
    color: "#FFFFFF",
    textAlign: "left",
    cursor: "pointer",
    transition: "0.18s ease",
}

const pacoteCardSelecionado: React.CSSProperties = {
    border: "1px solid #58C8ED",
    boxShadow: "0 0 0 1px rgba(88, 200, 237, 0.16)",
    background: "#101C29",
}

const pacoteCardDesabilitado: React.CSSProperties = {
    opacity: 0.5,
    cursor: "not-allowed",
}

const popularTag: React.CSSProperties = {
    position: "absolute",
    top: "11px",
    right: "11px",
    padding: "4px 7px",
    borderRadius: "999px",
    background: "#58C8ED",
    color: "#06111A",
    fontSize: "7px",
    fontWeight: 900,
}

const pacoteMoeda: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "30px",
    fontWeight: 900,
}

const pacoteCoins: React.CSSProperties = {
    marginTop: "5px",
    fontSize: "31px",
    fontWeight: 900,
    letterSpacing: "-1px",
}

const pacoteNome: React.CSSProperties = {
    marginTop: "4px",
    color: "#C8D2DF",
    fontSize: "12px",
    fontWeight: 800,
}

const pacoteDescricao: React.CSSProperties = {
    minHeight: "42px",
    marginTop: "9px",
    color: "#7F8DA0",
    fontSize: "10px",
    lineHeight: 1.5,
}

const pacotePreco: React.CSSProperties = {
    marginTop: "17px",
    fontSize: "19px",
    fontWeight: 800,
}

const pacoteBotao: React.CSSProperties = {
    marginTop: "13px",
    padding: "9px 10px",
    borderRadius: "8px",
    background: "#172332",
    color: "#AAB6C5",
    fontSize: "9px",
    fontWeight: 900,
    textAlign: "center",
}

const pacoteBotaoSelecionado: React.CSSProperties = {
    ...pacoteBotao,
    background: "#58C8ED",
    color: "#06111A",
}

const rodapeCard: React.CSSProperties = {
    marginTop: "22px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "18px",
    border: "1px solid #263244",
    borderRadius: "13px",
    background: "#0C131D",
}

const rodapeTitulo: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 800,
}

const rodapeTexto: React.CSSProperties = {
    maxWidth: "670px",
    marginTop: "5px",
    color: "#7F8DA0",
    fontSize: "10px",
    lineHeight: 1.5,
}

const precoResumo: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "22px",
    fontWeight: 900,
}

const notaPrototype: React.CSSProperties = {
    marginTop: "14px",
    color: "#66758A",
    fontSize: "9px",
    lineHeight: 1.5,
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
