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
    getDoc,
    collection,
    query,
    where,
    limit,
    getDocs,
    writeBatch,
    serverTimestamp,
    onSnapshot,
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


const CATEGORIAS: Record<string, string[]> = {
    Gaming: [
        "Ação / Aventura",
        "RPG",
        "Esportes",
        "Simulação",
    ],
    "Música": [
        "Rock",
        "Sertanejo",
        "Eletrônica",
        "Funk",
    ],
    "Just Chatting": [
        "Bate-Papo",
        "Perguntas e Respostas",
        "Histórias",
        "Desafios",
    ],
    Criatividade: [
        "Desenho",
        "Design",
        "Fotografia",
        "Edição",
    ],
    Esportes: [
        "Futebol",
        "Basquete",
        "Automobilismo",
        "Lutas",
    ],
    Tecnologia: [
        "Programação",
        "Hardware",
        "Inteligência Artificial",
        "Ciência e Tech",
    ],
    Podcasts: [
        "Conversas",
        "Entrevistas",
        "Notícias",
        "Entretenimento",
    ],
    IRL: [
        "Viagens",
        "Eventos",
        "Vida Cotidiana",
        "Exploração",
    ],
}


type StreamData = {
    id: string
    streamerUid: string
    channelId: string
    title: string
    description: string
    categoryId: string
    thumbnailURL: string
    status: string
    playbackURL: string
    viewerCount: number
}


function separarCategoria(categoryId: string) {
    const valor =
        String(categoryId || "").trim()

    if (!valor) {
        return {
            principal: "Gaming",
            subcategoria: "",
        }
    }

    const partes =
        valor.split(" - ")

    const principal =
        partes[0]?.trim() ||
        "Gaming"

    const subcategoria =
        partes.slice(1).join(" - ").trim()

    return {
        principal:
            CATEGORIAS[principal]
                ? principal
                : "Gaming",
        subcategoria,
    }
}


function nomeTwitch(playbackURL: string) {
    if (!playbackURL) {
        return ""
    }

    try {
        const url =
            new URL(
                playbackURL
            )

        return (
            url.pathname
                .split("/")
                .filter(Boolean)[0] ??
            ""
        )
    } catch {
        return playbackURL
    }
}


export default function ConfigLive() {
    const [user, setUser] =
        useState<User | null>(null)

    const [stream, setStream] =
        useState<StreamData | null>(null)

    const [streamId, setStreamId] =
        useState("")

    const [carregando, setCarregando] =
        useState(true)

    const [salvando, setSalvando] =
        useState(false)

    const [alterandoStatus, setAlterandoStatus] =
        useState(false)

    const [erro, setErro] =
        useState("")

    const [sucesso, setSucesso] =
        useState("")

    const [titulo, setTitulo] =
        useState("")

    const [descricao, setDescricao] =
        useState("")

    const [categoria, setCategoria] =
        useState("Gaming")

    const [subcategoria, setSubcategoria] =
        useState("")

    const [thumbnail, setThumbnail] =
        useState("")


    const subcategorias =
        useMemo(
            () =>
                CATEGORIAS[categoria] ??
                [],
            [categoria]
        )


    useEffect(() => {
        const unsubscribe =
            onAuthStateChanged(
                auth,

                async usuario => {
                    setUser(usuario)

                    if (!usuario) {
                        setCarregando(false)
                        return
                    }

                    await descobrirStream(
                        usuario.uid
                    )
                }
            )

        return () => unsubscribe()
    }, [])


    async function descobrirStream(uid: string) {
        setCarregando(true)
        setErro("")

        try {
            const canalSnap =
                await getDoc(
                    doc(
                        db,
                        "channels",
                        uid
                    )
                )

            if (!canalSnap.exists()) {
                setErro(
                    "Esta conta ainda não é uma conta de streamer."
                )
                setCarregando(false)
                return
            }

            const canal =
                canalSnap.data()

            let id =
                String(
                    canal.currentStreamId ??
                    ""
                )

            if (id) {
                const streamSnap =
                    await getDoc(
                        doc(
                            db,
                            "streams",
                            id
                        )
                    )

                if (!streamSnap.exists()) {
                    id = ""
                }
            }

            if (!id) {
                const consulta =
                    query(
                        collection(
                            db,
                            "streams"
                        ),
                        where(
                            "streamerUid",
                            "==",
                            uid
                        ),
                        limit(1)
                    )

                const resultado =
                    await getDocs(
                        consulta
                    )

                if (resultado.empty) {
                    setErro(
                        "Seu canal existe, mas a configuração da live não foi encontrada."
                    )
                    setCarregando(false)
                    return
                }

                id =
                    resultado.docs[0].id
            }

            setStreamId(id)
        } catch (error) {
            console.error(error)
            setErro(
                "Não foi possível carregar sua configuração."
            )
            setCarregando(false)
        }
    }


    useEffect(() => {
        if (!streamId) {
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

                snapshot => {
                    if (!snapshot.exists()) {
                        setErro(
                            "A transmissão não existe."
                        )
                        setCarregando(false)
                        return
                    }

                    const data =
                        snapshot.data()

                    const novaStream:
                        StreamData =
                    {
                        id:
                            snapshot.id,
                        streamerUid:
                            String(
                                data.streamerUid ??
                                ""
                            ),
                        channelId:
                            String(
                                data.channelId ??
                                ""
                            ),
                        title:
                            String(
                                data.title ??
                                ""
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
                        thumbnailURL:
                            String(
                                data.thumbnailURL ??
                                ""
                            ),
                        status:
                            String(
                                data.status ??
                                "offline"
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
                    }

                    const categoriaAtual =
                        separarCategoria(
                            novaStream.categoryId
                        )

                    setStream(
                        novaStream
                    )
                    setTitulo(
                        novaStream.title
                    )
                    setDescricao(
                        novaStream.description
                    )
                    setCategoria(
                        categoriaAtual.principal
                    )
                    setSubcategoria(
                        categoriaAtual.subcategoria
                    )
                    setThumbnail(
                        novaStream.thumbnailURL
                    )
                    setErro("")
                    setCarregando(false)
                },

                error => {
                    console.error(error)
                    setErro(
                        "Não foi possível acompanhar sua live."
                    )
                    setCarregando(false)
                }
            )

        return () => unsubscribe()
    }, [streamId])


    function mudarCategoria(
        novaCategoria: string
    ) {
        setCategoria(
            novaCategoria
        )

        setSubcategoria("")
    }


    async function salvarConfiguracao() {
        if (
            !user ||
            !stream ||
            !streamId
        ) {
            return
        }

        if (!titulo.trim()) {
            setErro(
                "Digite um título para a live."
            )
            return
        }

        if (!subcategoria) {
            setErro(
                "Escolha uma subcategoria para a live."
            )
            return
        }

        const categoryId =
            `${categoria} - ${subcategoria}`

        setSalvando(true)
        setErro("")
        setSucesso("")

        try {
            const batch =
                writeBatch(db)

            batch.update(
                doc(
                    db,
                    "streams",
                    streamId
                ),
                {
                    title:
                        titulo.trim(),
                    description:
                        descricao.trim(),
                    categoryId,
                    thumbnailURL:
                        thumbnail.trim(),
                }
            )

            batch.update(
                doc(
                    db,
                    "channels",
                    user.uid
                ),
                {
                    description:
                        descricao.trim(),
                    categoryId,
                    currentStreamId:
                        streamId,
                }
            )

            await batch.commit()

            setSucesso(
                "Configurações salvas com sucesso."
            )

            window.setTimeout(
                () => setSucesso(""),
                3000
            )
        } catch (error: any) {
            console.error(error)
            setErro(
                error?.message
                    ? `Erro: ${error.message}`
                    : "Não foi possível salvar."
            )
        } finally {
            setSalvando(false)
        }
    }


    async function alterarStatusLive() {
        if (
            !user ||
            !stream ||
            !streamId
        ) {
            return
        }

        if (
            stream.status !== "live" &&
            !subcategoria
        ) {
            setErro(
                "Escolha e salve uma subcategoria antes de iniciar a live."
            )
            return
        }

        setAlterandoStatus(true)
        setErro("")
        setSucesso("")

        try {
            const ficandoLive =
                stream.status !== "live"

            const batch =
                writeBatch(db)

            if (ficandoLive) {
                batch.update(
                    doc(
                        db,
                        "streams",
                        streamId
                    ),
                    {
                        status: "live",
                        startedAt:
                            serverTimestamp(),
                        endedAt: null,
                    }
                )

                batch.update(
                    doc(
                        db,
                        "channels",
                        user.uid
                    ),
                    {
                        isLive: true,
                        currentStreamId:
                            streamId,
                    }
                )
            } else {
                batch.update(
                    doc(
                        db,
                        "streams",
                        streamId
                    ),
                    {
                        status: "offline",
                        endedAt:
                            serverTimestamp(),
                    }
                )

                batch.update(
                    doc(
                        db,
                        "channels",
                        user.uid
                    ),
                    {
                        isLive: false,
                        currentStreamId:
                            streamId,
                    }
                )
            }

            await batch.commit()

            setSucesso(
                ficandoLive
                    ? "Você está ao vivo na Zytrix."
                    : "Transmissão encerrada."
            )

            window.setTimeout(
                () => setSucesso(""),
                3000
            )
        } catch (error: any) {
            console.error(error)
            setErro(
                error?.message
                    ? `Erro: ${error.message}`
                    : "Não foi possível alterar o status."
            )
        } finally {
            setAlterandoStatus(false)
        }
    }


    if (carregando) {
        return (
            <div style={estado}>
                Carregando configurações...
            </div>
        )
    }

    if (!user) {
        return (
            <div style={bloqueado}>
                <div style={bloqueadoIcon}>
                    🔒
                </div>

                <h2 style={bloqueadoTitulo}>
                    Entre na sua conta
                </h2>

                <p style={bloqueadoTexto}>
                    Faça login para configurar sua transmissão.
                </p>
            </div>
        )
    }

    if (erro && !stream) {
        return (
            <div style={bloqueado}>
                <div style={bloqueadoIcon}>
                    🎥
                </div>

                <h2 style={bloqueadoTitulo}>
                    Configuração indisponível
                </h2>

                <p style={bloqueadoTexto}>
                    {erro}
                </p>
            </div>
        )
    }

    if (!stream) {
        return null
    }

    const estaLive =
        stream.status === "live"

    const twitch =
        nomeTwitch(
            stream.playbackURL
        )

    const categoryIdAtual =
        subcategoria
            ? `${categoria} - ${subcategoria}`
            : categoria


    return (
        <div style={pagina}>
            <div style={cabecalho}>
                <div>
                    <div style={tag}>
                        PAINEL DO STREAMER
                    </div>

                    <h1 style={tituloPagina}>
                        Configurar live
                    </h1>

                    <p style={subtitulo}>
                        Prepare sua transmissão antes de entrar ao vivo.
                    </p>
                </div>

                <div
                    style={
                        estaLive
                            ? badgeLive
                            : badgeOffline
                    }
                >
                    <span
                        style={{
                            ...dot,
                            background:
                                estaLive
                                    ? "#FF3D60"
                                    : "#788797",
                        }}
                    />

                    {estaLive
                        ? "AO VIVO"
                        : "OFFLINE"}
                </div>
            </div>

            <div style={layout}>
                <div style={colunaPrincipal}>
                    <div style={secao}>
                        <label style={label}>
                            THUMBNAIL DA LIVE
                        </label>

                        <div style={thumbPreview}>
                            {thumbnail ? (
                                <img
                                    key={thumbnail}
                                    src={thumbnail}
                                    alt="Thumbnail"
                                    style={thumbImagem}
                                />
                            ) : (
                                <div style={thumbVazia}>
                                    <div style={thumbIcon}>
                                        🖼
                                    </div>

                                    <div>
                                        Nenhuma thumbnail configurada
                                    </div>
                                </div>
                            )}

                            <div style={previewBadge}>
                                PRÉVIA
                            </div>
                        </div>

                        <input
                            value={thumbnail}
                            onChange={event =>
                                setThumbnail(
                                    event.target.value
                                )
                            }
                            placeholder="https://site.com/minha-thumb.jpg"
                            style={input}
                        />
                    </div>

                    <div style={secao}>
                        <label style={label}>
                            TÍTULO DA LIVE
                        </label>

                        <input
                            value={titulo}
                            maxLength={120}
                            onChange={event =>
                                setTitulo(
                                    event.target.value
                                )
                            }
                            placeholder="Digite o título da transmissão"
                            style={input}
                        />

                        <div style={contador}>
                            {titulo.length}/120
                        </div>
                    </div>

                    <div style={secao}>
                        <label style={label}>
                            DESCRIÇÃO
                        </label>

                        <textarea
                            value={descricao}
                            maxLength={500}
                            onChange={event =>
                                setDescricao(
                                    event.target.value
                                )
                            }
                            placeholder="Conte aos espectadores o que está acontecendo na live..."
                            style={textarea}
                        />

                        <div style={contador}>
                            {descricao.length}/500
                        </div>
                    </div>

                    <div style={duasColunas}>
                        <div style={secao}>
                            <label style={label}>
                                CATEGORIA
                            </label>

                            <select
                                value={categoria}
                                onChange={event =>
                                    mudarCategoria(
                                        event.target.value
                                    )
                                }
                                style={select}
                            >
                                {Object.keys(
                                    CATEGORIAS
                                ).map(item => (
                                    <option
                                        key={item}
                                        value={item}
                                    >
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={secao}>
                            <label style={label}>
                                SUBCATEGORIA
                            </label>

                            <select
                                value={subcategoria}
                                onChange={event =>
                                    setSubcategoria(
                                        event.target.value
                                    )
                                }
                                style={select}
                            >
                                <option value="">
                                    Selecione...
                                </option>

                                {subcategorias.map(
                                    item => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    <div style={categoriaPreview}>
                        Será salvo como: 
                        <strong>
                            {categoryIdAtual}
                        </strong>
                    </div>

                    {erro && (
                        <div style={erroBox}>
                            {erro}
                        </div>
                    )}

                    {sucesso && (
                        <div style={sucessoBox}>
                            ✓ {sucesso}
                        </div>
                    )}

                    <button
                        style={{
                            ...botaoSalvar,
                            opacity:
                                salvando
                                    ? 0.65
                                    : 1,
                        }}
                        disabled={salvando}
                        onClick={
                            salvarConfiguracao
                        }
                    >
                        {salvando
                            ? "Salvando..."
                            : "Salvar configurações"}
                    </button>
                </div>

                <div style={lateral}>
                    <div style={painelStatus}>
                        <div style={painelTitulo}>
                            STATUS DA LIVE
                        </div>

                        <div
                            style={
                                estaLive
                                    ? statusGrandeLive
                                    : statusGrandeOffline
                            }
                        >
                            <span
                                style={{
                                    ...statusDot,
                                    background:
                                        estaLive
                                            ? "#FF3D60"
                                            : "#687787",
                                }}
                            />

                            {estaLive
                                ? "AO VIVO"
                                : "OFFLINE"}
                        </div>

                        <div style={separador} />

                        <div style={infoLinha}>
                            <span style={infoLabel}>
                                Espectadores
                            </span>

                            <strong style={infoValor}>
                                {stream.viewerCount.toLocaleString(
                                    "pt-BR"
                                )}
                            </strong>
                        </div>

                        <div style={infoLinha}>
                            <span style={infoLabel}>
                                Categoria
                            </span>

                            <strong style={infoValor}>
                                {categoryIdAtual}
                            </strong>
                        </div>

                        <div style={separador} />

                        <div style={twitchLabel}>
                            TWITCH CONECTADA
                        </div>

                        <div style={twitchBox}>
                            <span style={twitchIcon}>
                                ◉
                            </span>

                            <span style={twitchNome}>
                                {twitch
                                    ? `twitch.tv/${twitch}`
                                    : stream.playbackURL}
                            </span>
                        </div>

                        <div style={avisoTwitch}>
                            {estaLive
                                ? "Sua transmissão está sendo exibida na Zytrix."
                                : "Inicie a transmissão na Twitch/OBS antes de entrar ao vivo na Zytrix."}
                        </div>

                        <button
                            onClick={
                                alterarStatusLive
                            }
                            disabled={
                                alterandoStatus
                            }
                            style={{
                                ...(estaLive
                                    ? botaoEncerrar
                                    : botaoIniciar),
                                opacity:
                                    alterandoStatus
                                        ? 0.65
                                        : 1,
                            }}
                        >
                            {alterandoStatus
                                ? "Aguarde..."
                                : estaLive
                                    ? "■ Encerrar live"
                                    : "● Iniciar live"}
                        </button>
                    </div>
                </div>
            </div>
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

const cabecalho: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "22px",
}

const tag: React.CSSProperties = {
    color: "#58C8ED",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "1.4px",
}

const tituloPagina: React.CSSProperties = {
    margin: "5px 0 0",
    color: "#FFFFFF",
    fontSize: "25px",
}

const subtitulo: React.CSSProperties = {
    margin: "5px 0 0",
    color: "#7E8C9B",
    fontSize: "10px",
}

const badgeOffline: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 10px",
    borderRadius: "7px",
    background: "#111C27",
    border: "1px solid #293645",
    color: "#92A0AF",
    fontSize: "9px",
    fontWeight: 800,
}

const badgeLive: React.CSSProperties = {
    ...badgeOffline,
    background: "rgba(255,61,96,.10)",
    border: "1px solid rgba(255,61,96,.35)",
    color: "#FF5473",
}

const dot: React.CSSProperties = {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
}

const layout: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 260px",
    gap: "18px",
    alignItems: "start",
}

const colunaPrincipal: React.CSSProperties = {
    padding: "18px",
    borderRadius: "13px",
    background: "#101824",
    border: "1px solid #202C3A",
}

const lateral: React.CSSProperties = {
    minWidth: 0,
}

const secao: React.CSSProperties = {
    position: "relative",
    marginBottom: "17px",
}

const duasColunas: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
}

const label: React.CSSProperties = {
    display: "block",
    marginBottom: "7px",
    color: "#758496",
    fontSize: "8px",
    fontWeight: 800,
    letterSpacing: "1px",
}

const input: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 11px",
    borderRadius: "8px",
    border: "1px solid #283747",
    outline: "none",
    background: "#080F17",
    color: "#FFFFFF",
    fontSize: "10px",
}

const textarea: React.CSSProperties = {
    ...input,
    minHeight: "100px",
    resize: "vertical",
    fontFamily: "Inter, Arial, sans-serif",
    lineHeight: 1.5,
}

const select: React.CSSProperties = {
    ...input,
    cursor: "pointer",
}

const contador: React.CSSProperties = {
    marginTop: "4px",
    color: "#566577",
    fontSize: "8px",
    textAlign: "right",
}

const categoriaPreview: React.CSSProperties = {
    marginTop: "-6px",
    marginBottom: "15px",
    padding: "9px 10px",
    borderRadius: "8px",
    border: "1px solid #223243",
    background: "#0A121B",
    color: "#7F8E9D",
    fontSize: "9px",
}

const thumbPreview: React.CSSProperties = {
    width: "100%",
    aspectRatio: "16/9",
    position: "relative",
    overflow: "hidden",
    marginBottom: "9px",
    borderRadius: "10px",
    background: "#070D14",
    border: "1px solid #223141",
}

const thumbImagem: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
}

const thumbVazia: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    alignItems: "center",
    justifyContent: "center",
    color: "#596A7B",
    fontSize: "9px",
}

const thumbIcon: React.CSSProperties = {
    fontSize: "25px",
}

const previewBadge: React.CSSProperties = {
    position: "absolute",
    top: "8px",
    left: "8px",
    padding: "4px 6px",
    borderRadius: "5px",
    background: "rgba(0,0,0,.75)",
    color: "#FFFFFF",
    fontSize: "7px",
    fontWeight: 800,
}

const botaoSalvar: React.CSSProperties = {
    width: "100%",
    padding: "11px",
    border: 0,
    borderRadius: "8px",
    background: "#58C8ED",
    color: "#061019",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 800,
}

const erroBox: React.CSSProperties = {
    marginBottom: "12px",
    padding: "9px 11px",
    borderRadius: "8px",
    background: "rgba(225,29,72,.08)",
    border: "1px solid rgba(225,29,72,.35)",
    color: "#FF8CA5",
    fontSize: "9px",
}

const sucessoBox: React.CSSProperties = {
    marginBottom: "12px",
    padding: "9px 11px",
    borderRadius: "8px",
    background: "rgba(88,200,237,.08)",
    border: "1px solid rgba(88,200,237,.30)",
    color: "#71D8F7",
    fontSize: "9px",
}

const painelStatus: React.CSSProperties = {
    padding: "16px",
    borderRadius: "13px",
    background: "#101824",
    border: "1px solid #202C3A",
}

const painelTitulo: React.CSSProperties = {
    color: "#758496",
    fontSize: "8px",
    fontWeight: 800,
    letterSpacing: "1px",
}

const statusGrandeOffline: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "10px",
    color: "#97A4B1",
    fontSize: "16px",
    fontWeight: 900,
}

const statusGrandeLive: React.CSSProperties = {
    ...statusGrandeOffline,
    color: "#FF4C6C",
}

const statusDot: React.CSSProperties = {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
}

const separador: React.CSSProperties = {
    height: "1px",
    margin: "14px 0",
    background: "#202C3A",
}

const infoLinha: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "9px",
}

const infoLabel: React.CSSProperties = {
    color: "#718092",
    fontSize: "9px",
}

const infoValor: React.CSSProperties = {
    color: "#FFFFFF",
    fontSize: "9px",
    textAlign: "right",
}

const twitchLabel: React.CSSProperties = {
    color: "#758496",
    fontSize: "8px",
    fontWeight: 800,
}

const twitchBox: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginTop: "7px",
    padding: "9px",
    borderRadius: "7px",
    background: "#0A121B",
}

const twitchIcon: React.CSSProperties = {
    color: "#A970FF",
    fontSize: "13px",
}

const twitchNome: React.CSSProperties = {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#D8C8FF",
    fontSize: "8px",
}

const avisoTwitch: React.CSSProperties = {
    marginTop: "11px",
    color: "#687789",
    fontSize: "8px",
    lineHeight: 1.5,
}

const botaoIniciar: React.CSSProperties = {
    width: "100%",
    marginTop: "15px",
    padding: "11px",
    border: 0,
    borderRadius: "8px",
    background: "#E11D48",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 900,
}

const botaoEncerrar: React.CSSProperties = {
    ...botaoIniciar,
    background: "#222E3B",
    border: "1px solid #3B4857",
}

const estado: React.CSSProperties = {
    width: "100%",
    minHeight: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8492A1",
    fontFamily: "Inter, Arial, sans-serif",
}

const bloqueado: React.CSSProperties = {
    width: "100%",
    minHeight: "320px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontFamily: "Inter, Arial, sans-serif",
}

const bloqueadoIcon: React.CSSProperties = {
    width: "58px",
    height: "58px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "15px",
    background: "#101824",
    fontSize: "25px",
}

const bloqueadoTitulo: React.CSSProperties = {
    margin: "16px 0 0",
    color: "#FFFFFF",
    fontSize: "20px",
}

const bloqueadoTexto: React.CSSProperties = {
    maxWidth: "400px",
    margin: "7px 0 0",
    color: "#7C8A99",
    fontSize: "10px",
}
