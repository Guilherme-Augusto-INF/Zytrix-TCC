import React, { useEffect, useState } from "react"

import { initializeApp, getApps } from "firebase/app"

import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    doc,
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


type LiveCard = {
    id: string
    streamerUid: string
    title: string
    categoryId: string
    thumbnailURL: string
    viewerCount: number
    username: string
    photoURL: string
}


function selecionarLive(live: LiveCard) {
    try {
        localStorage.setItem("zytrixSelectedStream", live.id)
        localStorage.setItem("zytrixSelectedStreamName", live.username)
        localStorage.setItem("zytrixSelectedStreamTitle", live.title)
    } catch (error) {
        console.error("Erro ao selecionar a live:", error)
    }
}


export default function LivesZytrix() {
    const [lives, setLives] = useState<LiveCard[]>([])
    const [selecionada, setSelecionada] = useState("")
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState("")

    useEffect(() => {
        try {
            setSelecionada(
                localStorage.getItem("zytrixSelectedStream") ?? ""
            )
        } catch {}
    }, [])

    useEffect(() => {
        const consulta = query(
            collection(db, "streams"),
            where("status", "==", "live")
        )

        const unsubscribe = onSnapshot(
            consulta,

            async snapshot => {
                try {
                    const base = snapshot.docs.map(streamDoc => {
                        const stream = streamDoc.data()

                        return {
                            id: streamDoc.id,
                            streamerUid: String(
                                stream.streamerUid ?? ""
                            ).trim(),
                            title: String(
                                stream.title ?? "Transmissão ao vivo"
                            ),
                            categoryId: String(
                                stream.categoryId ?? ""
                            ),
                            thumbnailURL: String(
                                stream.thumbnailURL ?? ""
                            ),
                            viewerCount: Math.max(
                                0,
                                Number(stream.viewerCount ?? 0)
                            ),
                        }
                    })

                    base.sort((a, b) => {
                        if (b.viewerCount !== a.viewerCount) {
                            return b.viewerCount - a.viewerCount
                        }

                        return a.id.localeCompare(b.id)
                    })

                    const top3 = base.slice(3, 7)

                    const completos = await Promise.all(
                        top3.map(async live => {
                            let username = "Streamer"
                            let photoURL = ""

                            if (live.streamerUid) {
                                try {
                                    const perfilSnap = await getDoc(
                                        doc(
                                            db,
                                            "profiles",
                                            live.streamerUid
                                        )
                                    )

                                    if (perfilSnap.exists()) {
                                        const perfil = perfilSnap.data()

                                        username = String(
                                            perfil.username ?? "Streamer"
                                        )

                                        photoURL = String(
                                            perfil.photoURL ?? ""
                                        )
                                    }
                                } catch (error) {
                                    console.error(
                                        "Erro ao carregar perfil:",
                                        error
                                    )
                                }
                            }

                            return {
                                ...live,
                                username,
                                photoURL,
                            }
                        })
                    )

                    setLives(completos)
                    setErro("")
                } catch (error) {
                    console.error(error)
                    setErro(
                        "Não foi possível carregar as transmissões."
                    )
                } finally {
                    setCarregando(false)
                }
            },

            error => {
                console.error(error)
                setErro(
                    "Não foi possível acessar as transmissões."
                )
                setCarregando(false)
            }
        )

        return () => unsubscribe()
    }, [])

    if (carregando) {
        return (
            <div style={estado}>
                Carregando transmissões...
            </div>
        )
    }

    if (erro) {
        return (
            <div style={estado}>
                {erro}
            </div>
        )
    }

    if (lives.length === 0) {
        return (
            <div style={vazio}>
                <div style={vazioTitulo}>
                    Nenhuma outra live :(
                </div>

                <div style={vazioTexto}>
                    As transmissões atuais estão entre os destaques.
                </div>
            </div>
        )
    }

    return (
        <div style={wrapper}>
            <div style={container}>
                {lives.map((live, index) => {
                    const ativa = selecionada === live.id

                    return (
                        <div
                            key={live.id}
                            style={{
                                ...card,
                                ...(ativa
                                    ? cardSelecionado
                                    : {}),
                            }}
                            onClick={() => {
                                selecionarLive(live)
                                setSelecionada(live.id)
                            }}
                        >
                            <div style={thumbnailArea}>
                                {live.thumbnailURL ? (
                                    <img
                                        src={live.thumbnailURL}
                                        alt={live.title}
                                        style={thumbnail}
                                    />
                                ) : (
                                    <div style={thumbnailPadrao}>
                                        <div style={logo}>Z</div>
                                        <div style={logoTexto}>
                                            ZYTRIX
                                        </div>
                                    </div>
                                )}

                                <div style={badgeLive}>
                                    <span style={bolinha} />
                                    AO VIVO
                                </div>

                                
                                <div style={viewers}>
                                    👁{" "}
                                    {live.viewerCount.toLocaleString(
                                        "pt-BR"
                                    )}
                                </div>

                                <div style={play}>
                                    {ativa ? "✓" : "▶"}
                                </div>
                            </div>

                            <div style={info}>
                                {live.photoURL ? (
                                    <img
                                        src={live.photoURL}
                                        alt={live.username}
                                        style={avatar}
                                    />
                                ) : (
                                    <div style={avatarPadrao}>
                                        {live.username
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                )}

                                <div style={dados}>
                                    <div style={nome}>
                                        {live.username}
                                    </div>

                                    <div style={titulo}>
                                        {live.title}
                                    </div>

                                    <div style={categoria}>
                                        {live.categoryId}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {selecionada && (
                <div style={selecionadoBox}>
                    ✓ Live selecionada. Use o botão nativo
                    "Assistir live" para abrir /live.
                </div>
            )}
        </div>
    )
}


const wrapper: React.CSSProperties = {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    fontFamily: "Inter, Arial, sans-serif",
}

const container: React.CSSProperties = {
    width: "100%",
    display: "grid",
    gridTemplateColumns:
        "repeat(4, minmax(0, 1fr))",
    gap: "12px",
}

const card: React.CSSProperties = {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    padding: "3px",
    border: "1px solid transparent",
    borderRadius: "12px",
    cursor: "pointer",
    boxSizing: "border-box",
}

const cardSelecionado: React.CSSProperties = {
    border: "1px solid #58C8ED",
    background: "rgba(88,200,237,.05)",
    boxShadow: "0 0 18px rgba(88,200,237,.12)",
}

const thumbnailArea: React.CSSProperties = {
    width: "100%",
    aspectRatio: "16 / 9",
    position: "relative",
    overflow: "hidden",
    borderRadius: "9px",
    border: "1px solid #17364A",
    backgroundColor: "#07101F",
}

const thumbnail: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
}

const thumbnailPadrao: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background:
        "linear-gradient(135deg,#07101F,#12344A)",
}

const logo: React.CSSProperties = {
    width: "42px",
    height: "42px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3FA5D1",
    color: "#05101A",
    fontSize: "24px",
    fontWeight: 900,
}

const logoTexto: React.CSSProperties = {
    marginTop: "6px",
    color: "#FFFFFF",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "2px",
}

const badgeLive: React.CSSProperties = {
    position: "absolute",
    top: "8px",
    left: "8px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 8px",
    borderRadius: "5px",
    backgroundColor: "#E11D48",
    color: "#FFFFFF",
    fontSize: "9px",
    fontWeight: 800,
}

const bolinha: React.CSSProperties = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#FFFFFF",
}

const badgeDestaque: React.CSSProperties = {
    position: "absolute",
    top: "8px",
    right: "8px",
    padding: "5px 7px",
    borderRadius: "5px",
    backgroundColor: "rgba(4,12,21,.92)",
    color: "#3FA5D1",
    fontSize: "8px",
    fontWeight: 800,
}

const viewers: React.CSSProperties = {
    position: "absolute",
    right: "8px",
    bottom: "8px",
    padding: "4px 7px",
    borderRadius: "5px",
    backgroundColor: "rgba(0,0,0,.78)",
    color: "#FFFFFF",
    fontSize: "9px",
    fontWeight: 700,
}

const play: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    backgroundColor: "rgba(63,165,209,.90)",
    color: "#05101A",
    fontSize: "16px",
    fontWeight: 900,
}

const info: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
}

const avatar: React.CSSProperties = {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
}

const avatarPadrao: React.CSSProperties = {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "#3FA5D1",
    color: "#05101A",
    fontSize: "12px",
    fontWeight: 900,
}

const dados: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
}

const nome: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
}

const titulo: React.CSSProperties = {
    marginTop: "2px",
    color: "#D1D5DB",
    fontSize: "10px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
}

const categoria: React.CSSProperties = {
    marginTop: "2px",
    color: "#3FA5D1",
    fontSize: "8px",
    fontWeight: 700,
    textTransform: "uppercase",
}

const selecionadoBox: React.CSSProperties = {
    marginTop: "12px",
    padding: "10px 12px",
    border: "1px solid rgba(88,200,237,.4)",
    borderRadius: "9px",
    background: "#101824",
    color: "#D1D5DB",
    fontSize: "10px",
}

const estado: React.CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: "140px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontFamily: "Inter, Arial, sans-serif",
}

const vazio: React.CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: "140px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed #263244",
    borderRadius: "9px",
    textAlign: "center",
    fontFamily: "Inter, Arial, sans-serif",
}

const vazioTitulo: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: "16px",
    fontWeight: 700,
}

const vazioTexto: React.CSSProperties = {
    marginTop: "5px",
    color: "#6B7280",
    fontSize: "10px",
}
