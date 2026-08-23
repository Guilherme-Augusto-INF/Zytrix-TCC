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
    onSnapshot,
    getDoc,
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
const VALOR_MAXIMO_APOIO = 100000


type StreamData = {
    id: string
    streamerUid: string
    title: string
    description: string
    categoryId: string
    playbackURL: string
    viewerCount: number
    status: string
}

type ProfileData = {
    username: string
    photoURL: string
}

type WalletData = {
    balance: number
    totalSent: number
    totalReceived: number
}


function pegarLiveSelecionada() {
    if (typeof window === "undefined") {
        return ""
    }

    try {
        return localStorage.getItem("zytrixSelectedStream") ?? ""
    } catch {
        return ""
    }
}


function extrairCanalTwitch(playbackURL: string) {
    const valor = String(playbackURL || "").trim()

    if (!valor) {
        return ""
    }

    if (/^[a-zA-Z0-9_]+$/.test(valor)) {
        return valor
    }

    try {
        const url = new URL(valor)
        const host = url.hostname.replace(/^www\./, "").toLowerCase()

        if (host === "player.twitch.tv") {
            return url.searchParams.get("channel") ?? ""
        }

        if (host === "twitch.tv") {
            return url.pathname.split("/").filter(Boolean)[0] ?? ""
        }
    } catch {}

    return ""
}


function criarPlayerURL(canal: string) {
    if (typeof window === "undefined") {
        return ""
    }

    const parametros = new URLSearchParams()

    parametros.set("channel", canal)
    parametros.set("autoplay", "true")
    parametros.set("muted", "true")

    const hosts = new Set<string>()

    if (window.location.hostname) {
        hosts.add(window.location.hostname)
    }

    try {
        if (document.referrer) {
            const referrer = new URL(document.referrer)

            if (referrer.hostname) {
                hosts.add(referrer.hostname)
            }
        }
    } catch {}

    hosts.forEach(host => {
        parametros.append("parent", host)
    })

    return "https://player.twitch.tv/?" + parametros.toString()
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


export default function LivePlayer() {
    const [streamId, setStreamId] = useState("")
    const [stream, setStream] = useState<StreamData | null>(null)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [usuario, setUsuario] = useState<User | null>(null)
    const [wallet, setWallet] = useState<WalletData | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState("")

    const [valorApoio, setValorApoio] = useState(50)
    const [valorPersonalizado, setValorPersonalizado] = useState("")
    const [enviandoApoio, setEnviandoApoio] = useState(false)
    const [erroApoio, setErroApoio] = useState("")
    const [sucessoApoio, setSucessoApoio] = useState("")

    useEffect(() => {
        const id = pegarLiveSelecionada()
        setStreamId(id)

        if (!id) {
            setErro("Selecione uma transmissão antes de entrar nesta página.")
            setCarregando(false)
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async user => {
            setUsuario(user)
            setWallet(null)

            if (!user) {
                return
            }

            try {
                await garantirCarteira(user)
            } catch (error) {
                console.error("Erro ao ativar carteira:", error)
                setErroApoio("Não foi possível carregar sua carteira de Zy Coins.")
            }
        })

        return () => unsubscribeAuth()
    }, [])

    useEffect(() => {
        if (!usuario) {
            return
        }

        const unsubscribeWallet = onSnapshot(
            doc(db, "wallets", usuario.uid),
            snapshot => {
                if (!snapshot.exists()) {
                    setWallet(null)
                    return
                }

                const data = snapshot.data()

                setWallet({
                    balance: Math.max(0, Number(data.balance ?? 0)),
                    totalSent: Math.max(0, Number(data.totalSent ?? 0)),
                    totalReceived: Math.max(0, Number(data.totalReceived ?? 0)),
                })
            },
            error => {
                console.error(error)
                setErroApoio("Não foi possível acompanhar seu saldo de Zy Coins.")
            }
        )

        return () => unsubscribeWallet()
    }, [usuario])

    useEffect(() => {
        if (!streamId) {
            return
        }

        const referencia = doc(db, "streams", streamId)

        const unsubscribe = onSnapshot(
            referencia,
            async snapshot => {
                if (!snapshot.exists()) {
                    setErro("Essa transmissão não existe.")
                    setCarregando(false)
                    return
                }

                const data = snapshot.data()

                const novaLive: StreamData = {
                    id: snapshot.id,
                    streamerUid: String(data.streamerUid ?? ""),
                    title: String(data.title ?? "Transmissão ao vivo"),
                    description: String(data.description ?? ""),
                    categoryId: String(data.categoryId ?? ""),
                    playbackURL: String(data.playbackURL ?? ""),
                    viewerCount: Math.max(0, Number(data.viewerCount ?? 0)),
                    status: String(data.status ?? ""),
                }

                setStream(novaLive)

                if (novaLive.streamerUid) {
                    try {
                        const perfilSnap = await getDoc(
                            doc(db, "profiles", novaLive.streamerUid)
                        )

                        if (perfilSnap.exists()) {
                            const perfil = perfilSnap.data()

                            setProfile({
                                username: String(perfil.username ?? "Streamer"),
                                photoURL: String(perfil.photoURL ?? ""),
                            })
                        }
                    } catch (error) {
                        console.error("Erro ao carregar perfil:", error)
                    }
                }

                setErro("")
                setCarregando(false)
            },
            error => {
                console.error(error)
                setErro("Não foi possível carregar essa transmissão.")
                setCarregando(false)
            }
        )

        return () => unsubscribe()
    }, [streamId])

    const twitchChannel = useMemo(
        () => extrairCanalTwitch(stream?.playbackURL ?? ""),
        [stream?.playbackURL]
    )

    const playerURL = useMemo(
        () => (twitchChannel ? criarPlayerURL(twitchChannel) : ""),
        [twitchChannel]
    )

    const valorFinalApoio = useMemo(() => {
        if (valorPersonalizado.trim()) {
            const numero = Number(valorPersonalizado)

            if (!Number.isFinite(numero)) {
                return 0
            }

            return Math.floor(numero)
        }

        return valorApoio
    }, [valorApoio, valorPersonalizado])

    async function apoiarStreamer() {
        if (!usuario || !stream || enviandoApoio) {
            return
        }

        setErroApoio("")
        setSucessoApoio("")

        if (usuario.uid === stream.streamerUid) {
            setErroApoio("Você não pode enviar Zy Coins para a própria live.")
            return
        }

        if (stream.status !== "live") {
            setErroApoio("Os apoios só podem ser enviados enquanto a live estiver ao vivo.")
            return
        }

        if (
            !Number.isInteger(valorFinalApoio) ||
            valorFinalApoio < 1 ||
            valorFinalApoio > VALOR_MAXIMO_APOIO
        ) {
            setErroApoio(
                `Digite um valor entre 1 e ${VALOR_MAXIMO_APOIO.toLocaleString("pt-BR")} Zy Coins.`
            )
            return
        }

        if (!wallet || wallet.balance < valorFinalApoio) {
            setErroApoio("Saldo insuficiente para enviar esse apoio.")
            return
        }

        setEnviandoApoio(true)

        try {
            const txRef = doc(collection(db, "zyCoinTransactions"))
            const senderWalletRef = doc(db, "wallets", usuario.uid)
            const recipientWalletRef = doc(db, "wallets", stream.streamerUid)
            const streamRef = doc(db, "streams", stream.id)

            await runTransaction(db, async transaction => {
                const senderSnap = await transaction.get(senderWalletRef)
                const recipientSnap = await transaction.get(recipientWalletRef)
                const streamSnap = await transaction.get(streamRef)

                if (!senderSnap.exists()) {
                    throw new Error("Sua carteira de Zy Coins não foi encontrada.")
                }

                if (!streamSnap.exists()) {
                    throw new Error("A live não está mais disponível.")
                }

                const liveAtual = streamSnap.data()

                if (
                    liveAtual.status !== "live" ||
                    String(liveAtual.streamerUid ?? "") !== stream.streamerUid
                ) {
                    throw new Error("A transmissão não está mais ao vivo.")
                }

                const sender = senderSnap.data()
                const senderBalance = Math.max(0, Number(sender.balance ?? 0))
                const senderTotalSent = Math.max(0, Number(sender.totalSent ?? 0))
                const senderTotalReceived = Math.max(
                    0,
                    Number(sender.totalReceived ?? 0)
                )

                if (senderBalance < valorFinalApoio) {
                    throw new Error("Saldo insuficiente para enviar esse apoio.")
                }

                transaction.update(senderWalletRef, {
                    balance: senderBalance - valorFinalApoio,
                    totalSent: senderTotalSent + valorFinalApoio,
                    totalReceived: senderTotalReceived,
                    lastTransactionId: txRef.id,
                    updatedAt: serverTimestamp(),
                })

                if (recipientSnap.exists()) {
                    const recipient = recipientSnap.data()

                    transaction.update(recipientWalletRef, {
                        balance:
                            Math.max(0, Number(recipient.balance ?? 0)) +
                            valorFinalApoio,
                        totalSent: Math.max(0, Number(recipient.totalSent ?? 0)),
                        totalReceived:
                            Math.max(0, Number(recipient.totalReceived ?? 0)) +
                            valorFinalApoio,
                        lastTransactionId: txRef.id,
                        updatedAt: serverTimestamp(),
                    })
                } else {
                    transaction.set(recipientWalletRef, {
                        uid: stream.streamerUid,
                        balance: BONUS_INICIAL + valorFinalApoio,
                        totalSent: 0,
                        totalReceived: valorFinalApoio,
                        lastTransactionId: txRef.id,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    })
                }

                transaction.set(txRef, {
                    transactionId: txRef.id,
                    fromUid: usuario.uid,
                    toUid: stream.streamerUid,
                    streamId: stream.id,
                    amount: valorFinalApoio,
                    type: "stream_support",
                    status: "completed",
                    createdAt: serverTimestamp(),
                })
            })

            setSucessoApoio(
                `Você apoiou ${profile?.username ?? "este streamer"} com ${valorFinalApoio.toLocaleString("pt-BR")} Zy Coins!`
            )
            setValorPersonalizado("")
        } catch (error: any) {
            console.error(error)
            setErroApoio(
                error?.message || "Não foi possível enviar as Zy Coins."
            )
        } finally {
            setEnviandoApoio(false)
        }
    }

    if (carregando) {
        return <div style={estado}>Carregando transmissão...</div>
    }

    if (erro) {
        return (
            <div style={erroArea}>
                <div style={erroIcone}>!</div>
                <div style={erroTitulo}>Live não encontrada</div>
                <div style={erroTexto}>{erro}</div>
            </div>
        )
    }

    if (!stream) {
        return null
    }

    const username = profile?.username ?? "Streamer"
    const apoioBloqueado =
        !usuario ||
        usuario.uid === stream.streamerUid ||
        stream.status !== "live" ||
        enviandoApoio

    return (
        <div style={pagina}>
            <div style={playerArea}>
                {playerURL ? (
                    <iframe
                        src={playerURL}
                        title={stream.title}
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        style={iframe}
                    />
                ) : (
                    <div style={playerErro}>
                        <strong>Player indisponível</strong>
                        <span style={{ marginTop: "7px" }}>
                            Configure o playbackURL desta transmissão.
                        </span>
                    </div>
                )}
            </div>

            <div style={infoArea}>
                <div style={{ minWidth: 0, flex: "1 1 500px" }}>
                    <div style={statusLinha}>
                        <div
                            style={
                                stream.status === "live"
                                    ? badgeLive
                                    : badgeOffline
                            }
                        >
                            ● {stream.status === "live" ? "AO VIVO" : "OFFLINE"}
                        </div>

                        <div style={categoria}>{stream.categoryId}</div>
                    </div>

                    <h1 style={titulo}>{stream.title}</h1>

                    {stream.description && (
                        <div style={descricao}>{stream.description}</div>
                    )}

                    <div style={criador}>
                        {profile?.photoURL ? (
                            <img
                                src={profile.photoURL}
                                alt={username}
                                style={avatar}
                            />
                        ) : (
                            <div style={avatarFallback}>
                                {username.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div>
                            <div style={nome}>{username}</div>
                            <div style={criadorTexto}>Criador Zytrix</div>
                        </div>
                    </div>
                </div>

                <div style={lateralInfo}>
                    <div style={viewersBox}>
                        <div style={viewersLabel}>ESPECTADORES</div>
                        <div style={viewersValor}>
                            👁 {stream.viewerCount.toLocaleString("pt-BR")}
                        </div>
                    </div>

                    <div style={walletMini}>
                        <div style={viewersLabel}>SEU SALDO</div>
                        <div style={walletMiniValor}>
                            ◈ {wallet?.balance.toLocaleString("pt-BR") ?? "0"}
                        </div>
                    </div>
                </div>
            </div>

            <section style={apoioCard}>
                <div style={apoioTopo}>
                    <div>
                        <div style={apoioEyebrow}>ZY COINS</div>
                        <div style={apoioTitulo}>Apoie {username}</div>
                        <div style={apoioTexto}>
                            Envie Zy Coins diretamente para este streamer durante
                            a transmissão.
                        </div>
                    </div>

                    {usuario && usuario.uid !== stream.streamerUid && (
                        <div style={saldoApoio}>
                            Saldo: ◈ {wallet?.balance.toLocaleString("pt-BR") ?? "0"}
                        </div>
                    )}
                </div>

                {!usuario ? (
                    <div style={apoioAviso}>
                        Entre na sua conta para enviar Zy Coins.
                    </div>
                ) : usuario.uid === stream.streamerUid ? (
                    <div style={apoioAviso}>
                        Esta é a sua transmissão. Você poderá receber Zy Coins dos
                        espectadores, mas não pode apoiar a própria live.
                    </div>
                ) : (
                    <>
                        <div style={valoresRapidos}>
                            {[10, 50, 100, 500].map(valor => (
                                <button
                                    key={valor}
                                    type="button"
                                    onClick={() => {
                                        setValorApoio(valor)
                                        setValorPersonalizado("")
                                    }}
                                    style={{
                                        ...valorBotao,
                                        ...(valorApoio === valor &&
                                        !valorPersonalizado
                                            ? valorBotaoAtivo
                                            : {}),
                                    }}
                                >
                                    ◈ {valor}
                                </button>
                            ))}

                            <input
                                type="number"
                                min={1}
                                max={VALOR_MAXIMO_APOIO}
                                value={valorPersonalizado}
                                onChange={event =>
                                    setValorPersonalizado(event.target.value)
                                }
                                placeholder="Outro valor"
                                style={inputValor}
                            />

                            <button
                                type="button"
                                disabled={apoioBloqueado}
                                onClick={apoiarStreamer}
                                style={{
                                    ...apoiarBotao,
                                    ...(apoioBloqueado ? botaoDesabilitado : {}),
                                }}
                            >
                                {enviandoApoio
                                    ? "ENVIANDO..."
                                    : `APOIAR COM ◈ ${Math.max(
                                          0,
                                          valorFinalApoio
                                      ).toLocaleString("pt-BR")}`}
                            </button>
                        </div>
                    </>
                )}

                {stream.status !== "live" && usuario?.uid !== stream.streamerUid && (
                    <div style={apoioAviso}>
                        Os apoios ficam disponíveis quando a transmissão estiver ao vivo.
                    </div>
                )}

                {erroApoio && <div style={apoioErro}>{erroApoio}</div>}
                {sucessoApoio && <div style={apoioSucesso}>{sucessoApoio}</div>}
            </section>
        </div>
    )
}


const pagina: React.CSSProperties = {
    width: "100%",
    height: "100%",
    color: "#FFFFFF",
    fontFamily: "Inter, Arial, sans-serif",
}

const playerArea: React.CSSProperties = {
    width: "100%",
    aspectRatio: "16/9",
    minHeight: "300px",
    overflow: "hidden",
    borderRadius: "14px",
    border: "1px solid #17364A",
    background: "#000000",
}

const iframe: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "block",
    border: 0,
}

const playerErro: React.CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: "300px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#080D14",
    color: "#8B99AA",
}

const infoArea: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "25px",
    paddingTop: "20px",
}

const lateralInfo: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "9px",
}

const statusLinha: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
}

const badgeLive: React.CSSProperties = {
    padding: "5px 8px",
    borderRadius: "5px",
    background: "#E11D48",
    color: "#FFFFFF",
    fontSize: "9px",
    fontWeight: 800,
}

const badgeOffline: React.CSSProperties = {
    ...badgeLive,
    background: "#374151",
}

const categoria: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
}

const titulo: React.CSSProperties = {
    margin: "9px 0 0",
    color: "#FFFFFF",
    fontSize: "25px",
}

const descricao: React.CSSProperties = {
    marginTop: "7px",
    color: "#8B99AA",
    fontSize: "12px",
}

const criador: React.CSSProperties = {
    marginTop: "17px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
}

const avatar: React.CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
}

const avatarFallback: React.CSSProperties = {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#3FA5D1",
    color: "#05101A",
    fontWeight: 900,
}

const nome: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 700,
}

const criadorTexto: React.CSSProperties = {
    color: "#8B99AA",
    fontSize: "9px",
}

const viewersBox: React.CSSProperties = {
    minWidth: "135px",
    height: "fit-content",
    padding: "13px 15px",
    border: "1px solid #263244",
    borderRadius: "10px",
    background: "#101824",
}

const viewersLabel: React.CSSProperties = {
    color: "#8B99AA",
    fontSize: "8px",
    fontWeight: 700,
}

const viewersValor: React.CSSProperties = {
    marginTop: "3px",
    color: "#FFFFFF",
    fontSize: "19px",
    fontWeight: 800,
}

const walletMini: React.CSSProperties = {
    minWidth: "135px",
    height: "fit-content",
    padding: "13px 15px",
    border: "1px solid #19415A",
    borderRadius: "10px",
    background: "#0C1721",
}

const walletMiniValor: React.CSSProperties = {
    marginTop: "3px",
    color: "#58C8ED",
    fontSize: "19px",
    fontWeight: 900,
}

const apoioCard: React.CSSProperties = {
    marginTop: "20px",
    padding: "18px",
    border: "1px solid #263244",
    borderRadius: "13px",
    background: "#0D151F",
}

const apoioTopo: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
}

const apoioEyebrow: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "8px",
    fontWeight: 900,
    letterSpacing: "1px",
}

const apoioTitulo: React.CSSProperties = {
    marginTop: "3px",
    color: "#FFFFFF",
    fontSize: "17px",
    fontWeight: 800,
}

const apoioTexto: React.CSSProperties = {
    marginTop: "4px",
    color: "#7F8DA0",
    fontSize: "10px",
}

const saldoApoio: React.CSSProperties = {
    padding: "7px 10px",
    border: "1px solid #19415A",
    borderRadius: "999px",
    background: "#0C202A",
    color: "#8DE2FF",
    fontSize: "9px",
    fontWeight: 800,
}

const valoresRapidos: React.CSSProperties = {
    marginTop: "14px",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
}

const valorBotao: React.CSSProperties = {
    padding: "9px 11px",
    border: "1px solid #263244",
    borderRadius: "8px",
    background: "#101824",
    color: "#B5C0CD",
    fontSize: "10px",
    fontWeight: 800,
    cursor: "pointer",
}

const valorBotaoAtivo: React.CSSProperties = {
    border: "1px solid #58C8ED",
    background: "#102331",
    color: "#58C8ED",
}

const inputValor: React.CSSProperties = {
    width: "120px",
    padding: "9px 10px",
    boxSizing: "border-box",
    border: "1px solid #263244",
    borderRadius: "8px",
    outline: "none",
    background: "#080D14",
    color: "#FFFFFF",
    fontSize: "10px",
}

const apoiarBotao: React.CSSProperties = {
    padding: "10px 14px",
    border: 0,
    borderRadius: "8px",
    background: "#58C8ED",
    color: "#06111A",
    fontSize: "9px",
    fontWeight: 900,
    cursor: "pointer",
}

const botaoDesabilitado: React.CSSProperties = {
    opacity: 0.5,
    cursor: "not-allowed",
}

const apoioAviso: React.CSSProperties = {
    marginTop: "13px",
    padding: "11px 12px",
    border: "1px solid #263244",
    borderRadius: "9px",
    background: "#101824",
    color: "#8B99AA",
    fontSize: "10px",
}

const apoioErro: React.CSSProperties = {
    marginTop: "11px",
    padding: "10px 12px",
    border: "1px solid #7F1D1D",
    borderRadius: "9px",
    background: "#2A1014",
    color: "#FDA4AF",
    fontSize: "10px",
}

const apoioSucesso: React.CSSProperties = {
    marginTop: "11px",
    padding: "10px 12px",
    border: "1px solid #155E75",
    borderRadius: "9px",
    background: "#0B222B",
    color: "#A5F3FC",
    fontSize: "10px",
    fontWeight: 700,
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

const erroArea: React.CSSProperties = {
    width: "100%",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontFamily: "Inter, Arial, sans-serif",
}

const erroIcone: React.CSSProperties = {
    width: "64px",
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "17px",
    background: "#101824",
    color: "#58C8ED",
    fontSize: "28px",
}

const erroTitulo: React.CSSProperties = {
    marginTop: "20px",
    color: "#FFFFFF",
    fontSize: "27px",
}

const erroTexto: React.CSSProperties = {
    marginTop: "9px",
    color: "#8B99AA",
    fontSize: "14px",
}
