import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"

import {
    initializeApp,
    getApps,
} from "firebase/app"

import {
    getAuth,
    onAuthStateChanged,
} from "firebase/auth"

import {
    getFirestore,
    doc,
    onSnapshot,
    getDoc,
    setDoc,
    collection,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore"


// ==================================================
// FIREBASE
// ==================================================

const firebaseConfig = {
    apiKey:
        "AIzaSyDLUogDD_G98mDO7SqEA_U6JX1HlRuseUE",
    authDomain:
        "zytrix-ca4f2.firebaseapp.com",
    projectId:
        "zytrix-ca4f2",
    storageBucket:
        "zytrix-ca4f2.firebasestorage.app",
    messagingSenderId:
        "538535719632",
    appId:
        "1:538535719632:web:b8a5de998ca8d1db00a4d5",
    measurementId:
        "G-422Y8YEZYX",
}

const app =
    getApps().length === 0
        ? initializeApp(firebaseConfig)
        : getApps()[0]

const auth = getAuth(app)
const db = getFirestore(app)


// ==================================================
// TIPOS
// ==================================================

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

type ChatMessage = {
    id: string
    username: string
    text: string
    time: string
    own?: boolean
}


// ==================================================
// PEGAR LIVE SELECIONADA
// ==================================================

function pegarLiveSelecionada() {
    if (
        typeof window ===
        "undefined"
    ) {
        return ""
    }

    try {
        return (
            localStorage.getItem(
                "zytrixSelectedStream"
            ) ?? ""
        )
    } catch {
        return ""
    }
}


// ==================================================
// TWITCH
// ==================================================

function extrairCanalTwitch(
    playbackURL: string
) {
    const valor =
        String(
            playbackURL || ""
        ).trim()

    if (!valor) {
        return ""
    }

    if (
        /^[a-zA-Z0-9_]+$/.test(
            valor
        )
    ) {
        return valor
    }

    try {
        const url =
            new URL(
                valor
            )

        const host =
            url.hostname
                .replace(
                    /^www\./,
                    ""
                )
                .toLowerCase()

        if (
            host ===
            "player.twitch.tv"
        ) {
            return (
                url.searchParams.get(
                    "channel"
                ) ?? ""
            )
        }

        if (
            host ===
            "twitch.tv"
        ) {
            return (
                url.pathname
                    .split("/")
                    .filter(Boolean)[0] ?? ""
            )
        }
    } catch {}

    return ""
}


function criarPlayerURL(
    canal: string
) {
    if (
        typeof window ===
        "undefined"
    ) {
        return ""
    }

    const parametros =
        new URLSearchParams()

    parametros.set(
        "channel",
        canal
    )

    parametros.set(
        "autoplay",
        "true"
    )

    parametros.set(
        "muted",
        "true"
    )

    const hosts =
        new Set<string>()

    if (
        window.location.hostname
    ) {
        hosts.add(
            window.location.hostname
        )
    }

    try {
        if (
            document.referrer
        ) {
            const referrer =
                new URL(
                    document.referrer
                )

            if (
                referrer.hostname
            ) {
                hosts.add(
                    referrer.hostname
                )
            }
        }
    } catch {}

    hosts.forEach(
        host => {
            parametros.append(
                "parent",
                host
            )
        }
    )

    return (
        "https://player.twitch.tv/?" +
        parametros.toString()
    )
}


// ==================================================
// CHAT SIMULADO
// ==================================================

const mensagensIniciais: ChatMessage[] = [
    {
        id: "sim-1",
        username: "ZyBot",
        text: "Bem-vindo ao chat da Zytrix! 💙",
        time: "agora",
    },
    {
        id: "sim-2",
        username: "LunaPlay",
        text: "Salve, chat! 👋",
        time: "agora",
    },
    {
        id: "sim-3",
        username: "NeoBR",
        text: "Essa live tá muito boa 🔥",
        time: "agora",
    },
    {
        id: "sim-4",
        username: "PixelX",
        text: "Bora apoiar o streamer! ◈",
        time: "agora",
    },
]


// ==================================================
// COMPONENTE
// ==================================================

export default function LivePlayer() {

    const [
        streamId,
        setStreamId,
    ] =
        useState("")

    const [
        stream,
        setStream,
    ] =
        useState<StreamData | null>(
            null
        )

    const [
        profile,
        setProfile,
    ] =
        useState<ProfileData | null>(
            null
        )

    const [
        usuario,
        setUsuario,
    ] =
        useState<any>(null)

    const [
        usuarioNome,
        setUsuarioNome,
    ] =
        useState("Visitante")

    const [
        saldo,
        setSaldo,
    ] =
        useState(0)

    const [
        carregando,
        setCarregando,
    ] =
        useState(true)

    const [
        erro,
        setErro,
    ] =
        useState("")

    const [
        mensagens,
        setMensagens,
    ] =
        useState<ChatMessage[]>(
            mensagensIniciais
        )

    const [
        textoChat,
        setTextoChat,
    ] =
        useState("")

    const [
        apoioAberto,
        setApoioAberto,
    ] =
        useState(false)

    const [
        valorApoio,
        setValorApoio,
    ] =
        useState(50)

    const [
        valorPersonalizado,
        setValorPersonalizado,
    ] =
        useState("")

    const [
        apoiando,
        setApoiando,
    ] =
        useState(false)

    const [
        mensagemApoio,
        setMensagemApoio,
    ] =
        useState("")

    const [
        erroApoio,
        setErroApoio,
    ] =
        useState("")

    const chatFimRef =
        useRef<HTMLDivElement | null>(
            null
        )


    // ==================================================
    // LOGIN
    // ==================================================

    useEffect(() => {

        const unsubscribe =
            onAuthStateChanged(
                auth,
                async user => {

                    setUsuario(user)

                    if (!user) {
                        setUsuarioNome(
                            "Visitante"
                        )
                        setSaldo(0)
                        return
                    }

                    try {
                        const perfilSnap =
                            await getDoc(
                                doc(
                                    db,
                                    "profiles",
                                    user.uid
                                )
                            )

                        if (
                            perfilSnap.exists()
                        ) {
                            const dados =
                                perfilSnap.data()

                            setUsuarioNome(
                                String(
                                    dados.username ||
                                    "Você"
                                )
                            )
                        } else {
                            setUsuarioNome(
                                "Você"
                            )
                        }
                    } catch {
                        setUsuarioNome(
                            "Você"
                        )
                    }
                }
            )

        return () =>
            unsubscribe()

    }, [])


    // ==================================================
    // SALDO
    // ==================================================

    useEffect(() => {

        if (!usuario) {
            return
        }

        const carteiraRef =
            doc(
                db,
                "wallets",
                usuario.uid
            )

        const unsubscribe =
            onSnapshot(
                carteiraRef,
                snapshot => {

                    if (
                        !snapshot.exists()
                    ) {
                        setSaldo(0)
                        return
                    }

                    setSaldo(
                        Math.max(
                            0,
                            Number(
                                snapshot.data().balance ??
                                0
                            )
                        )
                    )
                },
                error => {
                    console.error(
                        "Erro ao carregar carteira:",
                        error
                    )
                    setSaldo(0)
                }
            )

        return () =>
            unsubscribe()

    }, [usuario])


    // ==================================================
    // ID
    // ==================================================

    useEffect(() => {

        const id =
            pegarLiveSelecionada()

        setStreamId(
            id
        )

        if (!id) {
            setErro(
                "Selecione uma transmissão antes de entrar nesta página."
            )

            setCarregando(
                false
            )
        }

    }, [])


    // ==================================================
    // STREAM
    // ==================================================

    useEffect(() => {

        if (
            !streamId
        ) {
            return
        }

        const referencia =
            doc(
                db,
                "streams",
                streamId
            )

        const unsubscribe =
            onSnapshot(
                referencia,
                async snapshot => {

                    if (
                        !snapshot.exists()
                    ) {
                        setErro(
                            "Essa transmissão não existe."
                        )

                        setCarregando(
                            false
                        )

                        return
                    }

                    const data =
                        snapshot.data()

                    const novaLive:
                        StreamData =
                    {
                        id:
                            snapshot.id,

                        streamerUid:
                            String(
                                data.streamerUid ??
                                ""
                            ),

                        title:
                            String(
                                data.title ??
                                "Transmissão ao vivo"
                            ),

                        description:
                            String(
                                data.description ??
                                ""
                            ),

                        categoryId:
                            String(
                                data.categoryId ??
                                ""
                            ),

                        playbackURL:
                            String(
                                data.playbackURL ??
                                ""
                            ),

                        viewerCount:
                            Math.max(
                                0,
                                Number(
                                    data.viewerCount ??
                                    0
                                )
                            ),

                        status:
                            String(
                                data.status ??
                                ""
                            ),
                    }

                    setStream(
                        novaLive
                    )

                    if (
                        novaLive.streamerUid
                    ) {
                        try {
                            const perfilSnap =
                                await getDoc(
                                    doc(
                                        db,
                                        "profiles",
                                        novaLive.streamerUid
                                    )
                                )

                            if (
                                perfilSnap.exists()
                            ) {
                                const perfil =
                                    perfilSnap.data()

                                setProfile({
                                    username:
                                        String(
                                            perfil.username ??
                                            "Streamer"
                                        ),

                                    photoURL:
                                        String(
                                            perfil.photoURL ??
                                            ""
                                        ),
                                })
                            }
                        } catch (
                            error
                        ) {
                            console.error(
                                error
                            )
                        }
                    }

                    setErro("")
                    setCarregando(
                        false
                    )
                },
                error => {
                    console.error(
                        error
                    )

                    setErro(
                        "Não foi possível carregar essa transmissão."
                    )

                    setCarregando(
                        false
                    )
                }
            )

        return () =>
            unsubscribe()

    }, [
        streamId
    ])


    // ==================================================
    // CHAT - AUTO SCROLL
    // ==================================================

    useEffect(() => {

        chatFimRef.current
            ?.scrollIntoView({
                behavior:
                    "smooth",
            })

    }, [mensagens])


    // ==================================================
    // CHAT - ENVIAR
    // ==================================================

    function enviarMensagemChat() {

        const texto =
            textoChat
                .trim()
                .slice(
                    0,
                    180
                )

        if (!texto) {
            return
        }

        const agora =
            new Date()

        const hora =
            agora.toLocaleTimeString(
                "pt-BR",
                {
                    hour:
                        "2-digit",
                    minute:
                        "2-digit",
                }
            )

        setMensagens(
            atual => [
                ...atual,
                {
                    id:
                        "local-" +
                        Date.now(),
                    username:
                        usuarioNome,
                    text:
                        texto,
                    time:
                        hora,
                    own:
                        true,
                },
            ]
        )

        setTextoChat("")
    }


    // ==================================================
    // ZY COINS - GARANTIR CARTEIRA
    // ==================================================

    async function garantirCarteira(
        uid: string
    ) {

        const carteiraRef =
            doc(
                db,
                "wallets",
                uid
            )

        const snapshot =
            await getDoc(
                carteiraRef
            )

        if (
            snapshot.exists()
        ) {
            return
        }

        await setDoc(
            carteiraRef,
            {
                uid,
                balance:
                    500,
                totalSent:
                    0,
                totalReceived:
                    0,
                lastTransactionId:
                    "",
                createdAt:
                    serverTimestamp(),
                updatedAt:
                    serverTimestamp(),
            }
        )
    }


    // ==================================================
    // ZY COINS - APOIAR
    // ==================================================

    async function apoiarStreamer() {

        if (
            !usuario
        ) {
            setErroApoio(
                "Entre na sua conta para apoiar um streamer."
            )
            return
        }

        if (
            !stream
        ) {
            return
        }

        if (
            stream.status !==
            "live"
        ) {
            setErroApoio(
                "Só é possível apoiar enquanto a transmissão estiver ao vivo."
            )
            return
        }

        if (
            usuario.uid ===
            stream.streamerUid
        ) {
            setErroApoio(
                "Você não pode enviar Zy Coins para a própria transmissão."
            )
            return
        }

        const amount =
            valorPersonalizado.trim()
                ? Math.floor(
                    Number(
                        valorPersonalizado
                    )
                )
                : valorApoio

        if (
            !Number.isFinite(
                amount
            ) ||
            amount < 1 ||
            amount > 100000
        ) {
            setErroApoio(
                "Digite um valor entre 1 e 100.000 Zy Coins."
            )
            return
        }

        try {
            setApoiando(
                true
            )

            setErroApoio("")
            setMensagemApoio("")

            // A carteira do próprio usuário precisa
            // existir antes da transação de apoio.
            await garantirCarteira(
                usuario.uid
            )

            const senderRef =
                doc(
                    db,
                    "wallets",
                    usuario.uid
                )

            const recipientRef =
                doc(
                    db,
                    "wallets",
                    stream.streamerUid
                )

            const transactionRef =
                doc(
                    collection(
                        db,
                        "zyCoinTransactions"
                    )
                )

            await runTransaction(
                db,
                async transaction => {

                    const senderSnap =
                        await transaction.get(
                            senderRef
                        )

                    const recipientSnap =
                        await transaction.get(
                            recipientRef
                        )

                    if (
                        !senderSnap.exists()
                    ) {
                        throw new Error(
                            "wallet-not-found"
                        )
                    }

                    const sender =
                        senderSnap.data()

                    const saldoAtual =
                        Number(
                            sender.balance ??
                            0
                        )

                    if (
                        saldoAtual <
                        amount
                    ) {
                        throw new Error(
                            "insufficient-balance"
                        )
                    }

                    const txId =
                        transactionRef.id

                    transaction.update(
                        senderRef,
                        {
                            balance:
                                saldoAtual -
                                amount,

                            totalSent:
                                Number(
                                    sender.totalSent ??
                                    0
                                ) +
                                amount,

                            lastTransactionId:
                                txId,

                            updatedAt:
                                serverTimestamp(),
                        }
                    )

                    if (
                        recipientSnap.exists()
                    ) {
                        const recipient =
                            recipientSnap.data()

                        transaction.update(
                            recipientRef,
                            {
                                balance:
                                    Number(
                                        recipient.balance ??
                                        0
                                    ) +
                                    amount,

                                totalReceived:
                                    Number(
                                        recipient.totalReceived ??
                                        0
                                    ) +
                                    amount,

                                lastTransactionId:
                                    txId,

                                updatedAt:
                                    serverTimestamp(),
                            }
                        )
                    } else {
                        transaction.set(
                            recipientRef,
                            {
                                uid:
                                    stream.streamerUid,

                                // A carteira nova recebe
                                // também o bônus inicial.
                                balance:
                                    500 +
                                    amount,

                                totalSent:
                                    0,

                                totalReceived:
                                    amount,

                                lastTransactionId:
                                    txId,

                                createdAt:
                                    serverTimestamp(),

                                updatedAt:
                                    serverTimestamp(),
                            }
                        )
                    }

                    transaction.set(
                        transactionRef,
                        {
                            transactionId:
                                txId,

                            fromUid:
                                usuario.uid,

                            toUid:
                                stream.streamerUid,

                            streamId:
                                stream.id,

                            amount,

                            type:
                                "stream_support",

                            status:
                                "completed",

                            createdAt:
                                serverTimestamp(),
                        }
                    )
                }
            )

            setMensagemApoio(
                `Você apoiou ${profile?.username ?? "o streamer"} com ◈ ${amount.toLocaleString("pt-BR")}!`
            )

            setMensagens(
                atual => [
                    ...atual,
                    {
                        id:
                            "apoio-" +
                            Date.now(),
                        username:
                            "ZyBot",
                        text:
                            `💙 ${usuarioNome} apoiou ${profile?.username ?? "o streamer"} com ◈ ${amount.toLocaleString("pt-BR")}!`,
                        time:
                            "agora",
                    },
                ]
            )

            setValorPersonalizado("")
        }

        catch (
            error: any
        ) {
            console.error(
                "Erro ao apoiar streamer:",
                error
            )

            if (
                error?.message ===
                "insufficient-balance"
            ) {
                setErroApoio(
                    "Você não possui Zy Coins suficientes."
                )
            } else if (
                error?.code ===
                "permission-denied"
            ) {
                setErroApoio(
                    "O Firebase bloqueou esse apoio. Confira se as regras de Zy Coins estão publicadas."
                )
            } else {
                setErroApoio(
                    "Não foi possível enviar o apoio."
                )
            }
        }

        finally {
            setApoiando(
                false
            )
        }
    }


    // ==================================================
    // TWITCH
    // ==================================================

    const twitchChannel =
        useMemo(
            () => {
                return (
                    extrairCanalTwitch(
                        stream?.playbackURL ??
                        ""
                    )
                )
            },
            [
                stream?.playbackURL
            ]
        )

    const playerURL =
        useMemo(
            () => {
                if (
                    !twitchChannel
                ) {
                    return ""
                }

                return (
                    criarPlayerURL(
                        twitchChannel
                    )
                )
            },
            [
                twitchChannel
            ]
        )


    // ==================================================
    // LOADING
    // ==================================================

    if (
        carregando
    ) {
        return (
            <div style={estado}>
                Carregando transmissão...
            </div>
        )
    }


    // ==================================================
    // ERRO
    // ==================================================

    if (
        erro
    ) {
        return (
            <div style={erroArea}>
                <div style={erroIcone}>
                    !
                </div>

                <div style={erroTitulo}>
                    Live não encontrada
                </div>

                <div style={erroTexto}>
                    {erro}
                </div>
            </div>
        )
    }

    if (
        !stream
    ) {
        return null
    }

    const username =
        profile?.username ??
        "Streamer"


    // ==================================================
    // INTERFACE
    // ==================================================

    return (
        <div style={pagina}>

            <div style={conteudoTopo}>

                {/* PLAYER + INFORMAÇÕES */}
                <div style={colunaPrincipal}>

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

                                <strong>
                                    Player indisponível
                                </strong>

                                <span
                                    style={{
                                        marginTop:
                                            "7px",
                                    }}
                                >
                                    Configure o playbackURL desta transmissão.
                                </span>

                            </div>

                        )}

                    </div>


                    <div style={infoArea}>

                        <div>

                            <div style={statusLinha}>

                                <div
                                    style={
                                        stream.status ===
                                        "live"
                                            ? badgeLive
                                            : badgeOffline
                                    }
                                >
                                    ●{" "}
                                    {stream.status ===
                                    "live"
                                        ? "AO VIVO"
                                        : "OFFLINE"}
                                </div>

                                <div style={categoria}>
                                    {stream.categoryId}
                                </div>

                            </div>


                            <h1 style={titulo}>
                                {stream.title}
                            </h1>


                            {stream.description && (

                                <div style={descricao}>
                                    {stream.description}
                                </div>

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
                                        {username
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                )}

                                <div>

                                    <div style={nome}>
                                        {username}
                                    </div>

                                    <div style={criadorTexto}>
                                        Criador Zytrix
                                    </div>

                                </div>

                            </div>

                        </div>


                        <div style={acoesDireita}>

                            <div style={viewersBox}>

                                <div style={viewersLabel}>
                                    ESPECTADORES
                                </div>

                                <div style={viewersValor}>
                                    👁{" "}
                                    {stream.viewerCount
                                        .toLocaleString(
                                            "pt-BR"
                                        )}
                                </div>

                            </div>


                            <button
                                type="button"
                                style={botaoApoiar}
                                onClick={() => {
                                    setApoioAberto(
                                        !apoioAberto
                                    )
                                    setErroApoio("")
                                    setMensagemApoio("")
                                }}
                            >
                                ◈ Apoiar streamer
                            </button>

                        </div>

                    </div>


                    {/* APOIO COM ZY COINS */}
                    {apoioAberto && (

                        <div style={apoioCard}>

                            <div style={apoioTopo}>

                                <div>

                                    <div style={apoioTag}>
                                        ZY COINS
                                    </div>

                                    <div style={apoioTitulo}>
                                        Apoie {username}
                                    </div>

                                    <div style={apoioTexto}>
                                        Envie Zy Coins para demonstrar apoio durante a live.
                                    </div>

                                </div>


                                <div style={saldoBox}>
                                    <div style={saldoLabel}>
                                        SEU SALDO
                                    </div>

                                    <div style={saldoValor}>
                                        ◈{" "}
                                        {usuario
                                            ? saldo.toLocaleString(
                                                "pt-BR"
                                            )
                                            : "--"}
                                    </div>
                                </div>

                            </div>


                            <div style={valoresApoio}>

                                {[10, 50, 100, 500].map(
                                    valor => (

                                        <button
                                            key={valor}
                                            type="button"
                                            style={
                                                valorApoio === valor &&
                                                !valorPersonalizado
                                                    ? valorBotaoAtivo
                                                    : valorBotao
                                            }
                                            onClick={() => {
                                                setValorApoio(
                                                    valor
                                                )
                                                setValorPersonalizado(
                                                    ""
                                                )
                                            }}
                                        >
                                            ◈ {valor}
                                        </button>

                                    )
                                )}

                                <input
                                    type="number"
                                    min={1}
                                    max={100000}
                                    value={valorPersonalizado}
                                    placeholder="Outro valor"
                                    onChange={event => {
                                        setValorPersonalizado(
                                            event.target.value
                                        )
                                    }}
                                    style={inputValor}
                                />

                            </div>


                            {erroApoio && (
                                <div style={apoioErro}>
                                    {erroApoio}
                                </div>
                            )}

                            {mensagemApoio && (
                                <div style={apoioSucesso}>
                                    ✓ {mensagemApoio}
                                </div>
                            )}


                            <button
                                type="button"
                                disabled={apoiando}
                                style={{
                                    ...confirmarApoio,
                                    opacity:
                                        apoiando
                                            ? 0.6
                                            : 1,
                                }}
                                onClick={apoiarStreamer}
                            >
                                {apoiando
                                    ? "Enviando..."
                                    : "Enviar apoio"}
                            </button>

                        </div>

                    )}

                </div>


                {/* CHAT */}
                <div style={chatCard}>

                    <div style={chatCabecalho}>

                        <div>

                            <div style={chatTag}>
                                AO VIVO
                            </div>

                            <div style={chatTitulo}>
                                Chat da transmissão
                            </div>

                        </div>

                        <div style={chatStatus}>
                            ●
                        </div>

                    </div>


                    <div style={chatAviso}>
                        Chat simulado — as mensagens digitadas ficam apenas nesta tela.
                    </div>


                    <div style={chatMensagens}>

                        {mensagens.map(
                            mensagem => (

                                <div
                                    key={mensagem.id}
                                    style={
                                        mensagem.own
                                            ? mensagemPropria
                                            : mensagemChat
                                    }
                                >

                                    <div style={mensagemLinhaTopo}>

                                        <span
                                            style={
                                                mensagem.username ===
                                                "ZyBot"
                                                    ? nomeBot
                                                    : nomeChat
                                            }
                                        >
                                            {mensagem.username}
                                        </span>

                                        <span style={horaChat}>
                                            {mensagem.time}
                                        </span>

                                    </div>

                                    <div style={textoMensagem}>
                                        {mensagem.text}
                                    </div>

                                </div>

                            )
                        )}

                        <div ref={chatFimRef} />

                    </div>


                    <div style={chatInputArea}>

                        <input
                            type="text"
                            maxLength={180}
                            value={textoChat}
                            placeholder="Enviar uma mensagem..."
                            style={chatInput}
                            onChange={event => {
                                setTextoChat(
                                    event.target.value
                                )
                            }}
                            onKeyDown={event => {
                                if (
                                    event.key ===
                                    "Enter"
                                ) {
                                    enviarMensagemChat()
                                }
                            }}
                        />

                        <button
                            type="button"
                            style={botaoEnviarChat}
                            onClick={enviarMensagemChat}
                        >
                            ➤
                        </button>

                    </div>


                    <div style={contadorChat}>
                        {textoChat.length}/180
                    </div>

                </div>

            </div>

        </div>
    )
}


// ==================================================
// ESTILOS
// ==================================================

const pagina: React.CSSProperties = {
    width: "100%",
    minHeight: "100%",
    boxSizing: "border-box",
    color: "#FFFFFF",
    fontFamily:
        "Inter, Arial, sans-serif",
}

const conteudoTopo: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "stretch",
    gap: "16px",
    flexWrap: "wrap",
}

const colunaPrincipal: React.CSSProperties = {
    flex: "1 1 620px",
    minWidth: "0",
}

const playerArea: React.CSSProperties = {
    width: "100%",
    aspectRatio: "16/9",
    minHeight: "300px",
    overflow: "hidden",
    borderRadius: "14px",
    border:
        "1px solid #17364A",
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
    display: "grid",
    gridTemplateColumns:
        "minmax(0, 1fr) auto",
    gap: "25px",
    paddingTop: "20px",
}

const statusLinha: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
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

const acoesDireita: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "stretch",
}

const viewersBox: React.CSSProperties = {
    minWidth: "135px",
    height: "fit-content",
    padding: "13px 15px",
    border:
        "1px solid #263244",
    borderRadius: "10px",
    background: "#101824",
    boxSizing: "border-box",
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

const botaoApoiar: React.CSSProperties = {
    minWidth: "135px",
    padding: "10px 12px",
    border: "1px solid #2CCEF0",
    borderRadius: "9px",
    background: "#102334",
    color: "#67E8F9",
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
}


// ==================================================
// APOIO
// ==================================================

const apoioCard: React.CSSProperties = {
    marginTop: "16px",
    padding: "16px",
    border: "1px solid #263244",
    borderRadius: "12px",
    background:
        "linear-gradient(135deg, #0B1421 0%, #0B1725 100%)",
}

const apoioTopo: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    flexWrap: "wrap",
}

const apoioTag: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "0.8px",
}

const apoioTitulo: React.CSSProperties = {
    marginTop: "4px",
    color: "#FFFFFF",
    fontSize: "18px",
    fontWeight: 800,
}

const apoioTexto: React.CSSProperties = {
    marginTop: "5px",
    color: "#8B99AA",
    fontSize: "11px",
}

const saldoBox: React.CSSProperties = {
    minWidth: "110px",
    padding: "9px 12px",
    borderRadius: "9px",
    background: "#101824",
    border: "1px solid #263244",
}

const saldoLabel: React.CSSProperties = {
    color: "#8B99AA",
    fontSize: "8px",
    fontWeight: 800,
}

const saldoValor: React.CSSProperties = {
    marginTop: "3px",
    color: "#67E8F9",
    fontSize: "18px",
    fontWeight: 900,
}

const valoresApoio: React.CSSProperties = {
    marginTop: "14px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
}

const valorBotao: React.CSSProperties = {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #263244",
    background: "#101824",
    color: "#DCE6F2",
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
}

const valorBotaoAtivo: React.CSSProperties = {
    ...valorBotao,
    border: "1px solid #58C8ED",
    background: "#123047",
    color: "#67E8F9",
}

const inputValor: React.CSSProperties = {
    width: "120px",
    padding: "9px 10px",
    boxSizing: "border-box",
    borderRadius: "8px",
    border: "1px solid #263244",
    outline: "none",
    background: "#080F1C",
    color: "#FFFFFF",
    fontSize: "11px",
}

const confirmarApoio: React.CSSProperties = {
    marginTop: "12px",
    padding: "10px 14px",
    border: 0,
    borderRadius: "8px",
    background: "#58C8ED",
    color: "#041019",
    fontSize: "11px",
    fontWeight: 900,
    cursor: "pointer",
}

const apoioErro: React.CSSProperties = {
    marginTop: "10px",
    color: "#FB7185",
    fontSize: "11px",
}

const apoioSucesso: React.CSSProperties = {
    marginTop: "10px",
    color: "#6EE7B7",
    fontSize: "11px",
}


// ==================================================
// CHAT
// ==================================================

const chatCard: React.CSSProperties = {
    width: "300px",
    maxWidth: "100%",
    minHeight: "460px",
    flex: "0 1 300px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    border: "1px solid #263244",
    borderRadius: "14px",
    background: "#0A111D",
}

const chatCabecalho: React.CSSProperties = {
    padding: "13px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom:
        "1px solid #1C2939",
}

const chatTag: React.CSSProperties = {
    color: "#E11D48",
    fontSize: "8px",
    fontWeight: 900,
}

const chatTitulo: React.CSSProperties = {
    marginTop: "2px",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 800,
}

const chatStatus: React.CSSProperties = {
    color: "#22C55E",
    fontSize: "12px",
}

const chatAviso: React.CSSProperties = {
    padding: "8px 12px",
    borderBottom:
        "1px solid #1C2939",
    background: "#0D1626",
    color: "#728096",
    fontSize: "8px",
    lineHeight: 1.4,
}

const chatMensagens: React.CSSProperties = {
    flex: 1,
    minHeight: "300px",
    maxHeight: "520px",
    overflowY: "auto",
    padding: "10px",
    boxSizing: "border-box",
}

const mensagemChat: React.CSSProperties = {
    marginBottom: "7px",
    padding: "8px 9px",
    borderRadius: "8px",
    background: "#101824",
}

const mensagemPropria: React.CSSProperties = {
    ...mensagemChat,
    background: "#102638",
    border:
        "1px solid #16415A",
}

const mensagemLinhaTopo: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
}

const nomeChat: React.CSSProperties = {
    color: "#67E8F9",
    fontSize: "9px",
    fontWeight: 800,
}

const nomeBot: React.CSSProperties = {
    ...nomeChat,
    color: "#A78BFA",
}

const horaChat: React.CSSProperties = {
    color: "#5F6E80",
    fontSize: "7px",
}

const textoMensagem: React.CSSProperties = {
    marginTop: "3px",
    color: "#DCE6F2",
    fontSize: "10px",
    lineHeight: 1.45,
    wordBreak: "break-word",
}

const chatInputArea: React.CSSProperties = {
    display: "flex",
    gap: "7px",
    padding: "10px",
    borderTop:
        "1px solid #1C2939",
}

const chatInput: React.CSSProperties = {
    flex: 1,
    minWidth: "0",
    padding: "9px 10px",
    borderRadius: "8px",
    border:
        "1px solid #263244",
    outline: "none",
    background: "#080F1C",
    color: "#FFFFFF",
    fontSize: "10px",
}

const botaoEnviarChat: React.CSSProperties = {
    width: "36px",
    border: 0,
    borderRadius: "8px",
    background: "#58C8ED",
    color: "#041019",
    fontSize: "13px",
    fontWeight: 900,
    cursor: "pointer",
}

const contadorChat: React.CSSProperties = {
    padding: "0 11px 9px",
    textAlign: "right",
    color: "#586679",
    fontSize: "7px",
}


// ==================================================
// ESTADOS
// ==================================================

const estado: React.CSSProperties = {
    width: "100%",
    minHeight: "350px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8B99AA",
    fontFamily:
        "Inter, Arial, sans-serif",
}

const erroArea: React.CSSProperties = {
    width: "100%",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontFamily:
        "Inter, Arial, sans-serif",
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
