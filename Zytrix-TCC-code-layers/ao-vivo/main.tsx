import React, { useEffect, useMemo, useState } from "react"

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
    description: string
    categoryId: string
    thumbnailURL: string
    viewerCount: number
    username: string
    photoURL: string
}


const filtros = [
    ["todos", "Todos"],
    ["Gaming", "🎮 Gaming"],
    ["Música", "🎵 Música"],
    ["Just Chatting", "🎙️ Just Chatting"],
    ["Criatividade", "🎨 Criatividade"],
    ["Esportes", "⚽ Esportes"],
    ["Tecnologia", "💻 Tecnologia"],
    ["Podcasts", "🎧 Podcasts"],
    ["IRL", "📹 IRL"],
]


function normalizar(texto: string) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
}


function categoriaPrincipal(categoryId: string) {
    return String(categoryId || "")
        .split(" - ")[0]
        .trim()
}


function selecionarLive(live: LiveCard) {
    try {
        localStorage.setItem("zytrixSelectedStream", live.id)
        localStorage.setItem("zytrixSelectedStreamName", live.username)
        localStorage.setItem("zytrixSelectedStreamTitle", live.title)
    } catch (error) {
        console.error("Erro ao selecionar live:", error)
    }
}


export default function AoVivo() {
    const [lives, setLives] = useState<LiveCard[]>([])
    const [selecionada, setSelecionada] = useState("")
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState("")
    const [filtro, setFiltro] = useState("todos")
    const [pesquisa, setPesquisa] = useState("")

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
                            description: String(
                                stream.description ?? ""
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

                    base.sort(
                        (a, b) =>
                            b.viewerCount -
                            a.viewerCount
                    )

                    const completos = await Promise.all(
                        base.map(async live => {
                            let username = "Streamer"
                            let photoURL = ""

                            if (live.streamerUid) {
                                try {
                                    const snap = await getDoc(
                                        doc(
                                            db,
                                            "profiles",
                                            live.streamerUid
                                        )
                                    )

                                    if (snap.exists()) {
                                        const perfil = snap.data()

                                        username = String(
                                            perfil.username ??
                                            "Streamer"
                                        )

                                        photoURL = String(
                                            perfil.photoURL ??
                                            ""
                                        )
                                    }
                                } catch (error) {
                                    console.error(error)
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
                        "Não foi possível carregar as lives."
                    )
                } finally {
                    setCarregando(false)
                }
            },

            error => {
                console.error(error)
                setErro(
                    "Não foi possível acessar as lives."
                )
                setCarregando(false)
            }
        )

        return () => unsubscribe()
    }, [])

    const exibidas = useMemo(() => {
        const termo = normalizar(pesquisa)

        return lives.filter(live => {
            const principal =
                categoriaPrincipal(
                    live.categoryId
                )

            const categoriaOk =
                filtro === "todos" ||
                principal === filtro

            if (!categoriaOk) {
                return false
            }

            if (!termo) {
                return true
            }

            const texto = normalizar(
                [
                    live.username,
                    live.title,
                    live.description,
                    live.categoryId,
                ].join(" ")
            )

            return texto.includes(termo)
        })
    }, [lives, filtro, pesquisa])

    return (
        <div style={pagina}>
            <div style={toolbar}>
                <div style={areaFiltros}>
                    {filtros.map(([id, label]) => (
                        <button
                            key={id}
                            style={{
                                ...botaoFiltro,
                                ...(filtro === id
                                    ? filtroAtivo
                                    : {}),
                            }}
                            onClick={() => setFiltro(id)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div style={busca}>
                    🔍

                    <input
                        value={pesquisa}
                        onChange={event =>
                            setPesquisa(
                                event.target.value
                            )
                        }
                        placeholder="Pesquisar lives..."
                        style={input}
                    />
                </div>
            </div>

            {carregando ? (
                <div style={estado}>
                    Carregando transmissões...
                </div>
            ) : erro ? (
                <div style={estado}>
                    {erro}
                </div>
            ) : exibidas.length === 0 ? (
                <div style={estado}>
                    Nenhuma transmissão encontrada.
                </div>
            ) : (
                <div style={grid}>
                    {exibidas.map(live => {
                        const ativa =
                            selecionada === live.id

                        return (
                            <div
                                key={live.id}
                                style={{
                                    ...card,
                                    ...(ativa
                                        ? cardAtivo
                                        : {}),
                                }}
                                onClick={() => {
                                    selecionarLive(live)
                                    setSelecionada(
                                        live.id
                                    )
                                }}
                            >
                                <div style={thumbArea}>
                                    {live.thumbnailURL ? (
                                        <img
                                            src={live.thumbnailURL}
                                            alt={live.title}
                                            style={thumb}
                                        />
                                    ) : (
                                        <div style={thumbVazia}>
                                            ZYTRIX
                                        </div>
                                    )}

                                    <div style={badgeAoVivo}>
                                        ● AO VIVO
                                    </div>

                                    <div style={viewers}>
                                        👁{" "}
                                        {live.viewerCount.toLocaleString(
                                            "pt-BR"
                                        )}
                                    </div>

                                    <div style={play}>
                                        {ativa
                                            ? "✓"
                                            : "▶"}
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
                                        <div style={avatarFallback}>
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
            )}

            {selecionada && (
                <div style={selecionado}>
                    ✓ Live selecionada. Use o botão nativo
                    "Assistir live" para abrir /live.
                </div>
            )}
        </div>
    )
}


const pagina: React.CSSProperties = {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    fontFamily: "Inter, Arial, sans-serif",
    color: "#FFFFFF",
}

const toolbar: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "22px",
    flexWrap: "wrap",
}

const areaFiltros: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
}

const botaoFiltro: React.CSSProperties = {
    border: "1px solid #263244",
    background: "#101824",
    color: "#8B99AA",
    borderRadius: "7px",
    padding: "8px 11px",
    cursor: "pointer",
}

const filtroAtivo: React.CSSProperties = {
    background: "#58C8ED",
    borderColor: "#58C8ED",
    color: "#07101F",
    fontWeight: 800,
}

const busca: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    minWidth: "230px",
    background: "#101824",
    border: "1px solid #263244",
    borderRadius: "8px",
    padding: "8px 10px",
}

const input: React.CSSProperties = {
    width: "100%",
    border: 0,
    outline: 0,
    background: "transparent",
    color: "#FFFFFF",
}

const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns:
        "repeat(4,minmax(0,1fr))",
    gap: "18px",
}

const card: React.CSSProperties = {
    minWidth: 0,
    padding: "3px",
    border: "1px solid transparent",
    borderRadius: "11px",
    cursor: "pointer",
}

const cardAtivo: React.CSSProperties = {
    border: "1px solid #58C8ED",
    background: "rgba(88,200,237,.05)",
}

const thumbArea: React.CSSProperties = {
    width: "100%",
    aspectRatio: "16 / 9",
    position: "relative",
    overflow: "hidden",
    borderRadius: "10px",
    border: "1px solid #17364A",
    background: "#07101F",
}

const thumb: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
}

const thumbVazia: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
        "linear-gradient(135deg,#07101F,#12344A)",
    color: "#58C8ED",
    fontWeight: 900,
}

const badgeAoVivo: React.CSSProperties = {
    position: "absolute",
    top: "8px",
    left: "8px",
    padding: "5px 7px",
    borderRadius: "5px",
    background: "#E11D48",
    color: "#FFFFFF",
    fontSize: "9px",
    fontWeight: 800,
}

const viewers: React.CSSProperties = {
    position: "absolute",
    right: "8px",
    bottom: "8px",
    padding: "4px 7px",
    borderRadius: "5px",
    background: "rgba(0,0,0,.75)",
    fontSize: "9px",
}

const play: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#3FA5D1",
    color: "#05101A",
    fontWeight: 900,
}

const info: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
}

const avatar: React.CSSProperties = {
    width: "32px",
    height: "32px",
    flexShrink: 0,
    borderRadius: "50%",
    objectFit: "cover",
}

const avatarFallback: React.CSSProperties = {
    width: "32px",
    height: "32px",
    flexShrink: 0,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#3FA5D1",
    color: "#05101A",
    fontWeight: 900,
}

const dados: React.CSSProperties = {
    minWidth: 0,
}

const nome: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 700,
}

const titulo: React.CSSProperties = {
    marginTop: "2px",
    color: "#D1D5DB",
    fontSize: "10px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
}

const categoria: React.CSSProperties = {
    marginTop: "2px",
    color: "#3FA5D1",
    fontSize: "8px",
    fontWeight: 700,
    textTransform: "uppercase",
}

const selecionado: React.CSSProperties = {
    marginTop: "14px",
    padding: "10px 12px",
    border: "1px solid rgba(88,200,237,.4)",
    borderRadius: "9px",
    background: "#101824",
    color: "#D1D5DB",
    fontSize: "10px",
}

const estado: React.CSSProperties = {
    width: "100%",
    minHeight: "180px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8B99AA",
}
