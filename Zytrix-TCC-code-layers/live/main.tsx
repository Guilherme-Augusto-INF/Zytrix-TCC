import React, { useEffect, useMemo, useState } from "react"

import { initializeApp, getApps } from "firebase/app"

import {
    getFirestore,
    doc,
    onSnapshot,
    getDoc,
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

const db = getFirestore(app)


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


function pegarLiveSelecionada() {
    if (typeof window === "undefined") {
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


function extrairCanalTwitch(playbackURL: string) {
    const valor =
        String(playbackURL || "").trim()

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
        const url = new URL(valor)

        const host =
            url.hostname
                .replace(/^www\./, "")
                .toLowerCase()

        if (
            host === "player.twitch.tv"
        ) {
            return (
                url.searchParams.get(
                    "channel"
                ) ?? ""
            )
        }

        if (
            host === "twitch.tv"
        ) {
            return (
                url.pathname
                    .split("/")
                    .filter(Boolean)[0] ??
                ""
            )
        }
    } catch {}

    return ""
}


function criarPlayerURL(canal: string) {
    if (
        typeof window === "undefined"
    ) {
        return ""
    }

    const parametros =
        new URLSearchParams()

    parametros.set("channel", canal)
    parametros.set("autoplay", "true")
    parametros.set("muted", "true")

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
        if (document.referrer) {
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

    hosts.forEach(host => {
        parametros.append(
            "parent",
            host
        )
    })

    return (
        "https://player.twitch.tv/?" +
        parametros.toString()
    )
}


export default function LivePlayer() {
    const [streamId, setStreamId] = useState("")
    const [stream, setStream] =
        useState<StreamData | null>(null)
    const [profile, setProfile] =
        useState<ProfileData | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState("")

    useEffect(() => {
        const id =
            pegarLiveSelecionada()

        setStreamId(id)

        if (!id) {
            setErro(
                "Selecione uma transmissão antes de entrar nesta página."
            )
            setCarregando(false)
        }
    }, [])

    useEffect(() => {
        if (!streamId) {
            return
        }

        const referencia = doc(
            db,
            "streams",
            streamId
        )

        const unsubscribe = onSnapshot(
            referencia,

            async snapshot => {
                if (!snapshot.exists()) {
                    setErro(
                        "Essa transmissão não existe."
                    )
                    setCarregando(false)
                    return
                }

                const data = snapshot.data()

                const novaLive: StreamData = {
                    id: snapshot.id,
                    streamerUid: String(
                        data.streamerUid ?? ""
                    ),
                    title: String(
                        data.title ??
                        "Transmissão ao vivo"
                    ),
                    description: String(
                        data.description ?? ""
                    ),
                    categoryId: String(
                        data.categoryId ?? ""
                    ),
                    playbackURL: String(
                        data.playbackURL ?? ""
                    ),
                    viewerCount: Math.max(
                        0,
                        Number(
                            data.viewerCount ?? 0
                        )
                    ),
                    status: String(
                        data.status ?? ""
                    ),
                }

                setStream(novaLive)

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
                    } catch (error) {
                        console.error(
                            "Erro ao carregar perfil:",
                            error
                        )
                    }
                }

                setErro("")
                setCarregando(false)
            },

            error => {
                console.error(error)
                setErro(
                    "Não foi possível carregar essa transmissão."
                )
                setCarregando(false)
            }
        )

        return () => unsubscribe()
    }, [streamId])

    const twitchChannel = useMemo(
        () =>
            extrairCanalTwitch(
                stream?.playbackURL ?? ""
            ),
        [stream?.playbackURL]
    )

    const playerURL = useMemo(
        () =>
            twitchChannel
                ? criarPlayerURL(
                      twitchChannel
                  )
                : "",
        [twitchChannel]
    )

    if (carregando) {
        return (
            <div style={estado}>
                Carregando transmissão...
            </div>
        )
    }

    if (erro) {
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

    if (!stream) {
        return null
    }

    const username =
        profile?.username ??
        "Streamer"

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
                        <strong>
                            Player indisponível
                        </strong>

                        <span
                            style={{
                                marginTop: "7px",
                            }}
                        >
                            Configure o playbackURL
                            desta transmissão.
                        </span>
                    </div>
                )}
            </div>

            <div style={infoArea}>
                <div>
                    <div style={statusLinha}>
                        <div
                            style={
                                stream.status === "live"
                                    ? badgeLive
                                    : badgeOffline
                            }
                        >
                            ●{" "}
                            {stream.status === "live"
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

                <div style={viewersBox}>
                    <div style={viewersLabel}>
                        ESPECTADORES
                    </div>

                    <div style={viewersValor}>
                        👁{" "}
                        {stream.viewerCount.toLocaleString(
                            "pt-BR"
                        )}
                    </div>
                </div>
            </div>
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
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "25px",
    paddingTop: "20px",
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
