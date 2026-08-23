import React, { useEffect, useState } from "react"

import {
    initializeApp,
    getApps,
} from "firebase/app"

import {
    getAuth,
    onAuthStateChanged,
    sendEmailVerification,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    EmailAuthProvider,
    reauthenticateWithCredential,
} from "firebase/auth"

import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    where,
    limit,
    getDocs,
    writeBatch,
    onSnapshot,
} from "firebase/firestore"


// ==================================================
// FIREBASE - ZYTRIX
// ==================================================

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

auth.languageCode = "pt-BR"


// ==================================================
// AVATAR PADRÃO
// ==================================================

const avatarPadrao =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
            <rect width="300" height="300" fill="#D1D5DB"/>
            <circle cx="150" cy="105" r="55" fill="#6B7280"/>
            <path d="M55 270c15-65 54-95 95-95s80 30 95 95" fill="#6B7280"/>
        </svg>
    `)


// ==================================================
// COMPONENTE
// ==================================================

export default function PerfilZytrix() {

    const [usuario, setUsuario] =
        useState<any>(null)

    const [perfil, setPerfil] =
        useState<any>(null)

    const [conta, setConta] =
        useState<any>(null)

    const [zyCoins, setZyCoins] =
        useState(0)

    const [carregando, setCarregando] =
        useState(true)

    const [editando, setEditando] =
        useState(false)

    const [mostrarId, setMostrarId] =
        useState(false)

    const [nome, setNome] =
        useState("")

    const [bio, setBio] =
        useState("")

    const [foto, setFoto] =
        useState("")

    const [erro, setErro] =
        useState("")

    const [mensagem, setMensagem] =
        useState("")

    const [salvando, setSalvando] =
        useState(false)


    // ==================================================
    // EMAIL
    // ==================================================

    const [emailVerificado, setEmailVerificado] =
        useState(false)

    const [enviandoEmail, setEnviandoEmail] =
        useState(false)

    const [cooldownEmail, setCooldownEmail] =
        useState(0)

    const [mensagemEmail, setMensagemEmail] =
        useState("")

    const [erroEmail, setErroEmail] =
        useState("")


    // ==================================================
    // STREAMER
    // ==================================================

    const [isStreamer, setIsStreamer] =
        useState(false)

    const [streamInfo, setStreamInfo] =
        useState<any>(null)

    const [etapaStreamer, setEtapaStreamer] =
        useState<
            "pergunta" |
            "twitch" |
            "obrigado"
        >("pergunta")

    const [twitchURL, setTwitchURL] =
        useState("")

    const [processandoStreamer, setProcessandoStreamer] =
        useState(false)

    const [erroStreamer, setErroStreamer] =
        useState("")

    const [mensagemStreamer, setMensagemStreamer] =
        useState("")


    // ==================================================
    // TROCA DA CONTA TWITCH
    // ==================================================

    const [alterandoTwitch, setAlterandoTwitch] =
        useState(false)

    const [novaTwitchURL, setNovaTwitchURL] =
        useState("")

    const [enviandoTrocaTwitch, setEnviandoTrocaTwitch] =
        useState(false)

    const [aguardandoTrocaTwitch, setAguardandoTrocaTwitch] =
        useState(false)

    const [mensagemTrocaTwitch, setMensagemTrocaTwitch] =
        useState("")

    const [erroTrocaTwitch, setErroTrocaTwitch] =
        useState("")


    // ==================================================
    // CARREGAR PERFIL
    // ==================================================

    async function carregarPerfil(user: any) {

        const perfilRef =
            doc(
                db,
                "profiles",
                user.uid
            )


        const contaRef =
            doc(
                db,
                "users",
                user.uid
            )


        const perfilSnap =
            await getDoc(perfilRef)


        const contaSnap =
            await getDoc(contaRef)


        if (!perfilSnap.exists()) {

            throw new Error(
                "Perfil não encontrado."
            )

        }


        if (!contaSnap.exists()) {

            throw new Error(
                "Conta não encontrada."
            )

        }


        const dadosPerfil =
            perfilSnap.data()


        const dadosConta =
            contaSnap.data()


        setPerfil(
            dadosPerfil
        )


        setConta(
            dadosConta
        )


        setNome(
            dadosPerfil.username || ""
        )


        setBio(
            dadosPerfil.bio || ""
        )


        setFoto(
            dadosPerfil.photoURL || ""
        )


        return dadosPerfil

    }


    // ==================================================
    // STREAMER - FUNÇÕES AUXILIARES
    // ==================================================

    function extrairUsuarioTwitch(
        valor: string
    ) {

        const entrada =
            valor.trim()


        if (!entrada) {

            return ""

        }


        try {

            let urlTexto =
                entrada


            if (
                !urlTexto.startsWith("http://") &&
                !urlTexto.startsWith("https://")
            ) {

                urlTexto =
                    "https://" +
                    urlTexto

            }


            const url =
                new URL(
                    urlTexto
                )


            const host =
                url.hostname
                    .replace(
                        /^www\./,
                        ""
                    )
                    .toLowerCase()


            if (
                host !== "twitch.tv" &&
                host !== "m.twitch.tv"
            ) {

                return ""

            }


            const twitchUser =
                url.pathname
                    .split("/")
                    .filter(Boolean)[0] ||
                ""


            if (
                !/^[a-zA-Z0-9_]{3,30}$/.test(
                    twitchUser
                )
            ) {

                return ""

            }


            return twitchUser

        }

        catch {

            return ""

        }

    }


    async function procurarStreamDoUsuario(
        uid: string
    ) {

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


        if (
            resultado.empty
        ) {

            return null

        }


        const streamDoc =
            resultado.docs[0]


        return {

            id:
                streamDoc.id,

            ...streamDoc.data(),

        }

    }


    // ==================================================
    // TROCAR CONTA TWITCH COM CONFIRMAÇÃO POR E-MAIL
    // ==================================================

    async function solicitarTrocaTwitch() {

        if (
            !usuario ||
            !streamInfo
        ) {

            setErroTrocaTwitch(
                "Não foi possível localizar sua live."
            )

            return

        }


        if (
            !usuario.email
        ) {

            setErroTrocaTwitch(
                "Sua conta não possui um e-mail disponível para confirmação."
            )

            return

        }


        const twitchUser =
            extrairUsuarioTwitch(
                novaTwitchURL
            )


        if (
            !twitchUser
        ) {

            setErroTrocaTwitch(
                "Digite um link válido da Twitch. Exemplo: https://www.twitch.tv/seucanal"
            )

            return

        }


        const canonicalURL =
            `https://www.twitch.tv/${twitchUser}`


        const atual =
            String(
                streamInfo.playbackURL ||
                ""
            )
                .replace(/\/$/, "")
                .toLowerCase()


        if (
            atual ===
            canonicalURL.toLowerCase()
        ) {

            setErroTrocaTwitch(
                "Essa já é a conta da Twitch vinculada ao seu canal."
            )

            return

        }


        try {

            setEnviandoTrocaTwitch(
                true
            )

            setErroTrocaTwitch("")

            setMensagemTrocaTwitch("")


            // Guardamos a troca somente como pendente.
            // O Firestore ainda NÃO é alterado aqui.
            localStorage.setItem(
                "zytrixPendingTwitchURL",
                canonicalURL
            )

            localStorage.setItem(
                "zytrixPendingTwitchUid",
                usuario.uid
            )

            localStorage.setItem(
                "zytrixPendingTwitchEmail",
                usuario.email
            )


            // O link volta para a mesma página do Perfil.
            // No Preview do Figma, isso usa a URL interna
            // do preview, não a URL externa do editor.
            const returnURL =
                window.location.origin +
                window.location.pathname


            await sendSignInLinkToEmail(
                auth,
                usuario.email,
                {
                    url:
                        returnURL,

                    handleCodeInApp:
                        true,
                }
            )


            setAguardandoTrocaTwitch(
                true
            )

            setMensagemTrocaTwitch(
                "Enviamos um link de confirmação para " +
                usuario.email +
                ". Abra esse e-mail neste mesmo navegador para concluir a troca."
            )

        }

        catch (
            error: any
        ) {

            console.error(
                "Erro ao enviar confirmação da Twitch:",
                error
            )


            if (
                error?.code ===
                "auth/operation-not-allowed"
            ) {

                setErroTrocaTwitch(
                    "Ative o login por link de e-mail no Firebase Authentication antes de usar esta função."
                )

            }

            else if (
                error?.code ===
                "auth/unauthorized-continue-uri"
            ) {

                const dominioAtual =
                    window.location.hostname

                const urlAtual =
                    window.location.origin +
                    window.location.pathname

                setErroTrocaTwitch(
                    "Firebase bloqueou o domínio usado pelo componente: " +
                    dominioAtual +
                    " | URL: " +
                    urlAtual
                )

            }

            else if (
                error?.code ===
                "auth/too-many-requests"
            ) {

                setErroTrocaTwitch(
                    "Muitas tentativas. Aguarde um pouco antes de pedir outro e-mail."
                )

            }

            else {

                setErroTrocaTwitch(
                    "Não foi possível enviar o e-mail de confirmação."
                )

            }

        }

        finally {

            setEnviandoTrocaTwitch(
                false
            )

        }

    }


    async function concluirTrocaTwitchPorEmail(
        user: any
    ) {

        if (
            typeof window ===
            "undefined"
        ) {

            return false

        }


        if (
            !isSignInWithEmailLink(
                auth,
                window.location.href
            )
        ) {

            return false

        }


        const pendingURL =
            localStorage.getItem(
                "zytrixPendingTwitchURL"
            ) || ""

        const pendingUid =
            localStorage.getItem(
                "zytrixPendingTwitchUid"
            ) || ""

        const pendingEmail =
            localStorage.getItem(
                "zytrixPendingTwitchEmail"
            ) || ""


        if (
            !pendingURL ||
            !pendingUid ||
            !pendingEmail
        ) {

            setErroTrocaTwitch(
                "A solicitação de troca não foi encontrada. Abra o link no mesmo navegador em que você pediu a alteração."
            )

            return false

        }


        if (
            user.uid !==
            pendingUid
        ) {

            setErroTrocaTwitch(
                "O link de confirmação pertence a outra conta Zytrix."
            )

            return false

        }


        try {

            setEnviandoTrocaTwitch(
                true
            )

            setErroTrocaTwitch("")

            setMensagemTrocaTwitch(
                "Confirmando a troca da Twitch..."
            )


            // O link recebido por e-mail vira uma credencial
            // de reautenticação. Só depois dela ser aceita a
            // alteração é escrita no Firestore.
            const credential =
                EmailAuthProvider
                    .credentialWithLink(
                        pendingEmail,
                        window.location.href
                    )


            await reauthenticateWithCredential(
                user,
                credential
            )


            const streamAtual =
                await procurarStreamDoUsuario(
                    user.uid
                )


            if (
                !streamAtual
            ) {

                throw new Error(
                    "stream-not-found"
                )

            }


            await updateDoc(
                doc(
                    db,
                    "streams",
                    streamAtual.id
                ),
                {
                    playbackURL:
                        pendingURL,
                }
            )


            localStorage.removeItem(
                "zytrixPendingTwitchURL"
            )

            localStorage.removeItem(
                "zytrixPendingTwitchUid"
            )

            localStorage.removeItem(
                "zytrixPendingTwitchEmail"
            )


            setStreamInfo({
                ...streamAtual,
                playbackURL:
                    pendingURL,
            })


            setNovaTwitchURL("")

            setAlterandoTwitch(
                false
            )

            setAguardandoTrocaTwitch(
                false
            )

            setMensagemTrocaTwitch(
                "Conta da Twitch alterada com sucesso."
            )


            // Remove o código de autenticação da URL para
            // evitar tentar reutilizá-lo em um refresh.
            try {

                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname
                )

            }

            catch {}


            return true

        }

        catch (
            error: any
        ) {

            console.error(
                "Erro ao confirmar troca da Twitch:",
                error
            )


            if (
                error?.code ===
                "auth/invalid-action-code" ||
                error?.code ===
                "auth/expired-action-code"
            ) {

                setErroTrocaTwitch(
                    "Esse link expirou ou já foi usado. Solicite uma nova troca da Twitch."
                )

            }

            else if (
                error?.code ===
                "auth/user-mismatch"
            ) {

                setErroTrocaTwitch(
                    "O e-mail confirmado não pertence à conta Zytrix atual."
                )

            }

            else {

                setErroTrocaTwitch(
                    "Não foi possível confirmar a troca da conta Twitch."
                )

            }


            return false

        }

        finally {

            setEnviandoTrocaTwitch(
                false
            )

        }

    }


    function cancelarTrocaTwitch() {

        localStorage.removeItem(
            "zytrixPendingTwitchURL"
        )

        localStorage.removeItem(
            "zytrixPendingTwitchUid"
        )

        localStorage.removeItem(
            "zytrixPendingTwitchEmail"
        )


        setNovaTwitchURL("")

        setAlterandoTwitch(
            false
        )

        setAguardandoTrocaTwitch(
            false
        )

        setErroTrocaTwitch("")

        setMensagemTrocaTwitch("")

    }


    async function carregarStreamer(
        user: any
    ) {

        try {

            setErroStreamer("")


            const canalRef =
                doc(
                    db,
                    "channels",
                    user.uid
                )


            const canalSnap =
                await getDoc(
                    canalRef
                )


            if (
                !canalSnap.exists()
            ) {

                setIsStreamer(
                    false
                )

                setStreamInfo(
                    null
                )

                return

            }


            const canal =
                canalSnap.data()


            let streamEncontrada:
                any =
                null


            const currentStreamId =
                String(
                    canal.currentStreamId ||
                    ""
                )


            if (
                currentStreamId
            ) {

                try {

                    const streamSnap =
                        await getDoc(

                            doc(
                                db,
                                "streams",
                                currentStreamId
                            )

                        )


                    if (
                        streamSnap.exists()
                    ) {

                        streamEncontrada =
                            {

                                id:
                                    streamSnap.id,

                                ...streamSnap.data(),

                            }

                    }

                }

                catch (
                    error
                ) {

                    console.error(
                        "Erro ao carregar live atual:",
                        error
                    )

                }

            }


            if (
                !streamEncontrada
            ) {

                streamEncontrada =
                    await procurarStreamDoUsuario(
                        user.uid
                    )

            }


            setIsStreamer(
                true
            )


            setStreamInfo(
                streamEncontrada
            )

        }

        catch (
            error
        ) {

            console.error(
                "Erro ao verificar streamer:",
                error
            )


            setErroStreamer(
                "Não foi possível verificar o seu canal de streamer."
            )

        }

    }


    function escolherSomenteAssistir() {

        setErroStreamer("")

        setMensagemStreamer(
            "Obrigado! Caso mude de ideia, volte aqui."
        )

        setEtapaStreamer(
            "obrigado"
        )


        window.setTimeout(
            () => {

                setMensagemStreamer("")

                setEtapaStreamer(
                    "pergunta"
                )

            },
            3000
        )

    }


    async function criarContaStreamer() {

        if (
            !usuario ||
            !perfil
        ) {

            setErroStreamer(
                "Você precisa estar logado para criar um canal."
            )

            return

        }


        const twitchUser =
            extrairUsuarioTwitch(
                twitchURL
            )


        if (
            !twitchUser
        ) {

            setErroStreamer(
                "Digite um link válido da Twitch. Exemplo: https://www.twitch.tv/seucanal"
            )

            return

        }


        try {

            setProcessandoStreamer(
                true
            )

            setErroStreamer("")

            setMensagemStreamer("")


            const canonicalURL =
                `https://www.twitch.tv/${twitchUser}`


            const canalRef =
                doc(
                    db,
                    "channels",
                    usuario.uid
                )


            const canalSnap =
                await getDoc(
                    canalRef
                )


            let streamExistente:
                any =
                null


            if (
                canalSnap.exists()
            ) {

                const canal =
                    canalSnap.data()


                const atual =
                    String(
                        canal.currentStreamId ||
                        ""
                    )


                if (
                    atual
                ) {

                    const streamSnap =
                        await getDoc(

                            doc(
                                db,
                                "streams",
                                atual
                            )

                        )


                    if (
                        streamSnap.exists()
                    ) {

                        streamExistente =
                            {

                                id:
                                    streamSnap.id,

                                ...streamSnap.data(),

                            }

                    }

                }

            }


            if (
                !streamExistente
            ) {

                streamExistente =
                    await procurarStreamDoUsuario(
                        usuario.uid
                    )

            }


            const streamId =
                streamExistente?.id ||
                usuario.uid


            const streamRef =
                doc(
                    db,
                    "streams",
                    streamId
                )


            const batch =
                writeBatch(
                    db
                )


            // ==========================================
            // CRIAR CANAL
            // ==========================================

            if (
                !canalSnap.exists()
            ) {

                batch.set(

                    canalRef,

                    {

                        ownerUid:
                            usuario.uid,

                        channelName:
                            perfil.username ||
                            "Streamer",

                        description:
                            perfil.bio ||
                            "",

                        avatarURL:
                            perfil.photoURL ||
                            "",

                        bannerURL:
                            "",

                        categoryId:
                            streamExistente?.categoryId ||
                            "Just Chatting",

                        isLive:
                            streamExistente?.status === "live",

                        currentStreamId:
                            streamId,

                        createdAt:
                            serverTimestamp(),

                    }

                )

            }

            else {

                const canal =
                    canalSnap.data()


                if (
                    String(
                        canal.currentStreamId ||
                        ""
                    ) !==
                    streamId
                ) {

                    batch.update(

                        canalRef,

                        {

                            currentStreamId:
                                streamId,

                        }

                    )

                }

            }


            // ==========================================
            // CRIAR / REUTILIZAR LIVE
            // ==========================================

            if (
                !streamExistente
            ) {

                batch.set(

                    streamRef,

                    {

                        streamerUid:
                            usuario.uid,

                        channelId:
                            usuario.uid,

                        title:
                            "Minha primeira live na Zytrix",

                        description:
                            "",

                        categoryId:
                            "Just Chatting",

                        thumbnailURL:
                            perfil.photoURL ||
                            "",

                        status:
                            "offline",

                        playbackURL:
                            canonicalURL,

                        startedAt:
                            null,

                        endedAt:
                            null,

                        createdAt:
                            serverTimestamp(),

                        viewerCount:
                            0,

                    }

                )

            }

            else {

                batch.update(

                    streamRef,

                    {

                        playbackURL:
                            canonicalURL,

                    }

                )

            }


            await batch.commit()


            setIsStreamer(
                true
            )


            setStreamInfo(
                {

                    ...(streamExistente || {}),

                    id:
                        streamId,

                    streamerUid:
                        usuario.uid,

                    channelId:
                        usuario.uid,

                    status:
                        streamExistente?.status ||
                        "offline",

                    playbackURL:
                        canonicalURL,

                }
            )


            setTwitchURL("")

            setEtapaStreamer(
                "pergunta"
            )


            setMensagemStreamer(
                "Conta de streamer criada com sucesso!"
            )

        }

        catch (
            error: any
        ) {

            console.error(
                "Erro ao criar streamer:",
                error
            )


            if (
                error?.code ===
                "permission-denied"
            ) {

                setErroStreamer(
                    "O Firebase bloqueou a criação do canal."
                )

            }

            else {

                setErroStreamer(
                    "Não foi possível transformar sua conta em streamer."
                )

            }

        }

        finally {

            setProcessandoStreamer(
                false
            )

        }

    }


    // ==================================================
    // VERIFICAR LOGIN
    // ==================================================

    useEffect(() => {

        const unsubscribe =
            onAuthStateChanged(
                auth,
                async (user) => {

                    if (!user) {

                        setUsuario(null)

                        setErro(
                            "Você precisa estar logado para visualizar o perfil."
                        )

                        setCarregando(false)

                        return

                    }


                    setUsuario(
                        user
                    )


                    try {

                        // Atualiza dados do Firebase Auth
                        await user.reload()


                        setEmailVerificado(
                            user.emailVerified
                        )


                        await carregarPerfil(
                            user
                        )


                        // Se esta página foi aberta a partir do
                        // e-mail de confirmação da troca da Twitch,
                        // conclui a alteração antes de recarregar
                        // os dados do streamer.
                        await concluirTrocaTwitchPorEmail(
                            user
                        )


                        await carregarStreamer(
                            user
                        )


                        setErro("")

                    }

                    catch (error) {

                        console.error(
                            error
                        )


                        setErro(
                            "Não foi possível carregar seu perfil."
                        )

                    }

                    finally {

                        setCarregando(false)

                    }

                }
            )


        return () => {

            unsubscribe()

        }

    }, [])


    // ==================================================
    // ZY COINS - SALDO EM TEMPO REAL
    // ==================================================

    useEffect(() => {

        if (!usuario) {

            setZyCoins(0)

            return

        }


        const carteiraRef =
            doc(
                db,
                "wallets",
                usuario.uid
            )


        const unsubscribeCarteira =
            onSnapshot(
                carteiraRef,
                (snapshot) => {

                    if (!snapshot.exists()) {

                        setZyCoins(0)

                        return

                    }


                    const dados =
                        snapshot.data()


                    const saldo =
                        Number(
                            dados.balance ?? 0
                        )


                    setZyCoins(
                        Number.isFinite(saldo)
                            ? Math.max(
                                0,
                                Math.floor(saldo)
                            )
                            : 0
                    )

                },
                (error) => {

                    console.error(
                        "Erro ao carregar Zy Coins:",
                        error
                    )

                    setZyCoins(0)

                }
            )


        return () => {

            unsubscribeCarteira()

        }

    }, [usuario])


    // ==================================================
    // COOLDOWN DO REENVIO DO EMAIL
    // ==================================================

    useEffect(() => {

        if (
            cooldownEmail <= 0
        ) {

            return

        }


        const timer =
            setTimeout(
                () => {

                    setCooldownEmail(
                        cooldownEmail - 1
                    )

                },
                1000
            )


        return () => {

            clearTimeout(
                timer
            )

        }

    }, [cooldownEmail])


    // ==================================================
    // REENVIAR VERIFICAÇÃO
    // ==================================================

    async function reenviarVerificacao() {

        if (!usuario) {

            setErroEmail(
                "Usuário não autenticado."
            )

            return

        }


        if (emailVerificado) {

            return

        }


        if (
            cooldownEmail > 0
        ) {

            return

        }


        try {

            setEnviandoEmail(true)

            setErroEmail("")

            setMensagemEmail("")


            await sendEmailVerification(
                usuario
            )


            setMensagemEmail(
                "E-mail enviado. Confira sua caixa de entrada."
            )


            // 60 segundos antes de reenviar
            setCooldownEmail(
                60
            )

        }

        catch (error: any) {

            console.error(
                "Erro ao enviar verificação:",
                error
            )


            if (
                error.code ===
                "auth/too-many-requests"
            ) {

                setErroEmail(
                    "Muitas tentativas. Aguarde um pouco antes de reenviar."
                )

            }

            else {

                setErroEmail(
                    "Não foi possível enviar o e-mail."
                )

            }

        }

        finally {

            setEnviandoEmail(false)

        }

    }


    // ==================================================
    // JÁ VERIFIQUEI
    // ==================================================

    async function conferirVerificacao() {

        if (!usuario) {

            return

        }


        try {

            setErroEmail("")

            setMensagemEmail(
                "Verificando..."
            )


            await usuario.reload()


            if (
                usuario.emailVerified
            ) {

                setEmailVerificado(
                    true
                )


                setMensagemEmail(
                    "E-mail verificado com sucesso!"
                )

            }

            else {

                setEmailVerificado(
                    false
                )


                setMensagemEmail("")


                setErroEmail(
                    "Seu e-mail ainda não foi verificado."
                )

            }

        }

        catch (error) {

            console.error(
                error
            )


            setMensagemEmail("")


            setErroEmail(
                "Não foi possível verificar o status do e-mail."
            )

        }

    }


    // ==================================================
    // DATA DE CRIAÇÃO
    // ==================================================

    function dataCriacaoConta() {

        if (
            !conta ||
            !conta.createdAt
        ) {

            return "Data indisponível"

        }


        if (
            typeof conta.createdAt.toDate !==
            "function"
        ) {

            return "Data indisponível"

        }


        const data =
            conta.createdAt.toDate()


        return data.toLocaleDateString(
            "pt-BR",
            {
                day:
                    "2-digit",

                month:
                    "long",

                year:
                    "numeric",
            }
        )

    }


    // ==================================================
    // COOLDOWN DO NOME
    // ==================================================

    function podeAlterarNome() {

        if (!perfil) {

            return false

        }


        const timestamp =
            perfil.usernameUpdatedAt


        if (!timestamp) {

            return true

        }


        if (
            typeof timestamp.toDate !==
            "function"
        ) {

            return false

        }


        const ultimaAlteracao =
            timestamp
                .toDate()
                .getTime()


        const seteDias =
            7 *
            24 *
            60 *
            60 *
            1000


        return (
            Date.now() >=
            ultimaAlteracao + seteDias
        )

    }


    // ==================================================
    // TEMPO RESTANTE PARA TROCAR NOME
    // ==================================================

    function textoTempoRestante() {

        if (!perfil) {

            return ""

        }


        if (
            podeAlterarNome()
        ) {

            return "Você já pode alterar seu nome de usuário."

        }


        const timestamp =
            perfil.usernameUpdatedAt


        if (
            !timestamp ||
            typeof timestamp.toDate !==
            "function"
        ) {

            return ""

        }


        const seteDias =
            7 *
            24 *
            60 *
            60 *
            1000


        const liberaEm =
            timestamp
                .toDate()
                .getTime()
            +
            seteDias


        let restante =
            liberaEm -
            Date.now()


        if (
            restante <= 0
        ) {

            return "Você já pode alterar seu nome de usuário."

        }


        const dias =
            Math.floor(
                restante /
                (
                    24 *
                    60 *
                    60 *
                    1000
                )
            )


        restante =
            restante %
            (
                24 *
                60 *
                60 *
                1000
            )


        const horas =
            Math.floor(
                restante /
                (
                    60 *
                    60 *
                    1000
                )
            )


        return (
            "Você poderá mudar o nome em " +
            dias +
            " dia(s) e " +
            horas +
            " hora(s)."
        )

    }


    // ==================================================
    // SALVAR PERFIL
    // ==================================================

    async function salvarPerfil() {

        if (
            !usuario ||
            !perfil
        ) {

            return

        }


        const nomeLimpo =
            nome.trim()


        const bioLimpa =
            bio.trim()


        const fotoLimpa =
            foto.trim()


        if (
            nomeLimpo.length < 2 ||
            nomeLimpo.length > 30
        ) {

            setErro(
                "O nome precisa ter entre 2 e 30 caracteres."
            )

            return

        }


        if (
            bioLimpa.length > 500
        ) {

            setErro(
                "A bio pode ter no máximo 500 caracteres."
            )

            return

        }


        const nomeMudou =
            nomeLimpo !==
            perfil.username


        if (
            nomeMudou &&
            !podeAlterarNome()
        ) {

            setErro(
                "Você ainda precisa esperar 7 dias para alterar o nome."
            )

            return

        }


        try {

            setSalvando(true)

            setErro("")

            setMensagem("")


            const dados: any = {

                photoURL:
                    fotoLimpa,

                bio:
                    bioLimpa,

            }


            if (
                nomeMudou
            ) {

                dados.username =
                    nomeLimpo


                dados.usernameUpdatedAt =
                    serverTimestamp()

            }


            await updateDoc(
                doc(
                    db,
                    "profiles",
                    usuario.uid
                ),
                dados
            )


            await carregarPerfil(
                usuario
            )


            setMensagem(
                "Perfil atualizado com sucesso."
            )


            setEditando(
                false
            )

        }

        catch (error: any) {

            console.error(
                error
            )


            if (
                error.code ===
                "permission-denied"
            ) {

                setErro(
                    "O Firebase bloqueou essa alteração."
                )

            }

            else {

                setErro(
                    "Não foi possível salvar o perfil."
                )

            }

        }

        finally {

            setSalvando(
                false
            )

        }

    }


    // ==================================================
    // CARREGANDO
    // ==================================================

    if (
        carregando
    ) {

        return (

            <div style={pagina}>

                Carregando perfil...

            </div>

        )

    }


    // ==================================================
    // SEM LOGIN
    // ==================================================

    if (
        !usuario ||
        !perfil ||
        !conta
    ) {

        return (

            <div style={pagina}>

                {erro ||
                    "Perfil indisponível."}

            </div>

        )

    }


    // ==================================================
    // FOTO
    // ==================================================

    const fotoAtual =
        perfil.photoURL &&
        perfil.photoURL.trim() !== ""

            ? perfil.photoURL

            : avatarPadrao


    // ==================================================
    // INTERFACE
    // ==================================================

    return (

        <div style={pagina}>

            <div style={card}>

                <div style={titulo}>

                    Perfil

                </div>


                <div style={linhaPerfil}>


                    {/* =================================
                        FOTO
                    ================================= */}

                    <div style={areaFoto}>

                        <img

                            src={fotoAtual}

                            alt="Foto de perfil"

                            style={imagemPerfil}

                            onError={(event) => {

                                event.currentTarget.src =
                                    avatarPadrao

                            }}

                        />


                        <button

                            type="button"

                            style={botaoEditar}

                            onClick={() => {

                                setEditando(
                                    !editando
                                )

                                setErro("")

                                setMensagem("")

                            }}

                        >

                            {editando
                                ? "Cancelar"
                                : "Editar perfil"
                            }

                        </button>

                    </div>


                    {/* =================================
                        INFORMAÇÕES
                    ================================= */}

                    <div style={informacoes}>


                        <div>

                            <strong>
                                Nome:
                            </strong>

                            {" "}

                            {perfil.username}

                        </div>


                        <div style={cooldown}>

                            {textoTempoRestante()}

                        </div>


                        {/* =============================
                            ID
                        ============================= */}

                        <div>

                            <strong>
                                ID:
                            </strong>

                            {" "}

                            {mostrarId
                                ? conta.zytrixId
                                : "Oculto"
                            }

                        </div>


                        <button

                            type="button"

                            style={botaoId}

                            onClick={() =>
                                setMostrarId(
                                    !mostrarId
                                )
                            }

                        >

                            {mostrarId
                                ? "Ocultar ID"
                                : "Mostrar ID"
                            }

                        </button>


                        {/* =============================
                            CONTA
                        ============================= */}

                        <div style={categoriaConta}>

                            <div style={tituloCategoria}>

                                Conta

                            </div>


                            {/* MEMBRO DESDE */}

                            <div style={linhaConta}>

                                <span>

                                    <strong>
                                        Membro desde:
                                    </strong>

                                </span>


                                <span>

                                    {dataCriacaoConta()}

                                </span>

                            </div>


                            {/* ZY COINS */}

                            <div style={separadorConta} />


                            <div style={linhaConta}>

                                <span>

                                    <strong>
                                        Zy Coins:
                                    </strong>

                                </span>


                                <span style={saldoZyCoins}>

                                    ◈{" "}

                                    {zyCoins.toLocaleString(
                                        "pt-BR"
                                    )}

                                </span>

                            </div>


                            {/* EMAIL */}

                            <div style={separadorConta} />


                            <div style={linhaConta}>

                                <div>

                                    <strong>
                                        E-mail:
                                    </strong>

                                    <div style={emailTexto}>

                                        {usuario.email ||
                                            "E-mail indisponível"}

                                    </div>

                                </div>


                                {emailVerificado ? (

                                    <div style={badgeVerificado}>

                                        ✓ Verificado

                                    </div>

                                ) : (

                                    <div style={badgePendente}>

                                        Não verificado

                                    </div>

                                )}

                            </div>


                            {/* EMAIL NÃO VERIFICADO */}

                            {!emailVerificado && (

                                <div style={areaVerificacao}>

                                    <div style={avisoEmail}>

                                        Confirme seu e-mail para aumentar a segurança da conta.

                                    </div>


                                    <div style={botoesEmail}>

                                        <button

                                            type="button"

                                            onClick={
                                                reenviarVerificacao
                                            }

                                            disabled={
                                                enviandoEmail ||
                                                cooldownEmail > 0
                                            }

                                            style={{
                                                ...botaoVerificacao,

                                                opacity:
                                                    enviandoEmail ||
                                                    cooldownEmail > 0

                                                        ? 0.55

                                                        : 1,
                                            }}

                                        >

                                            {enviandoEmail

                                                ? "Enviando..."

                                                : cooldownEmail > 0

                                                    ? "Reenviar em " +
                                                      cooldownEmail +
                                                      "s"

                                                    : "Reenviar e-mail"
                                            }

                                        </button>


                                        <button

                                            type="button"

                                            onClick={
                                                conferirVerificacao
                                            }

                                            style={
                                                botaoJaVerifiquei
                                            }

                                        >

                                            Já verifiquei

                                        </button>

                                    </div>


                                    {mensagemEmail && (

                                        <div style={sucessoEmail}>

                                            {mensagemEmail}

                                        </div>

                                    )}


                                    {erroEmail && (

                                        <div style={erroEmailStyle}>

                                            {erroEmail}

                                        </div>

                                    )}

                                </div>

                            )}


                            {/* EMAIL VERIFICADO */}

                            {emailVerificado &&
                                mensagemEmail && (

                                <div style={sucessoEmail}>

                                    {mensagemEmail}

                                </div>

                            )}

                        </div>


                        {/* =============================
                            BIO
                        ============================= */}

                        <div style={bioVisual}>

                            <strong>
                                Bio:
                            </strong>

                            {" "}

                            {perfil.bio &&
                            perfil.bio.trim() !== ""

                                ? perfil.bio

                                : "Nenhuma descrição adicionada."
                            }

                        </div>


                        {/* =============================
                            STREAMER
                        ============================= */}

                        <div style={areaStreamerPerfil}>

                            {isStreamer ? (

                                <>

                                    <div style={streamerCabecalho}>

                                        <div style={streamerIcone}>
                                            🎥
                                        </div>


                                        <div style={streamerCabecalhoTexto}>

                                            <div style={streamerTag}>
                                                CONTA DE STREAMER
                                            </div>


                                            <div style={streamerTitulo}>
                                                Seu canal está pronto
                                            </div>

                                        </div>


                                        <div
                                            style={
                                                streamInfo?.status === "live"
                                                    ? streamerStatusLive
                                                    : streamerStatusOffline
                                            }
                                        >

                                            ●{" "}

                                            {streamInfo?.status === "live"
                                                ? "AO VIVO"
                                                : "OFFLINE"
                                            }

                                        </div>

                                    </div>


                                    <div style={streamerDescricao}>

                                        Configure o título, descrição, categoria e thumbnail da sua transmissão na página Configurar Live.

                                    </div>


                                    <div style={streamerTwitchArea}>

                                        <div style={streamerTwitchLinha}>

                                            <div style={streamerTwitchDados}>

                                                <div style={streamerTwitchLabel}>
                                                    TWITCH VINCULADA
                                                </div>


                                                <div style={streamerTwitch}>

                                                    {streamInfo?.playbackURL ||
                                                        "Nenhuma conta vinculada"
                                                    }

                                                </div>

                                            </div>


                                            {!alterandoTwitch && (

                                                <button

                                                    type="button"

                                                    style={streamerBotaoAlterarTwitch}

                                                    onClick={() => {

                                                        setAlterandoTwitch(
                                                            true
                                                        )

                                                        setNovaTwitchURL("")

                                                        setErroTrocaTwitch("")

                                                        setMensagemTrocaTwitch("")

                                                    }}

                                                >

                                                    Alterar Twitch

                                                </button>

                                            )}

                                        </div>


                                        {alterandoTwitch && (

                                            <div style={streamerTrocaTwitchArea}>

                                                <div style={streamerTrocaAviso}>
                                                    🔐 A conta da Twitch só será trocada depois que você confirmar pelo e-mail da sua conta Zytrix.
                                                </div>


                                                <label style={streamerLabel}>
                                                    NOVO LINK DA TWITCH
                                                </label>


                                                <input

                                                    type="text"

                                                    value={novaTwitchURL}

                                                    placeholder="https://www.twitch.tv/novocanal"

                                                    disabled={
                                                        enviandoTrocaTwitch ||
                                                        aguardandoTrocaTwitch
                                                    }

                                                    onChange={(event) => {

                                                        setNovaTwitchURL(
                                                            event.target.value
                                                        )

                                                        setErroTrocaTwitch("")

                                                    }}

                                                    style={streamerInput}

                                                />


                                                {mensagemTrocaTwitch && (

                                                    <div style={streamerSucesso}>
                                                        {mensagemTrocaTwitch}
                                                    </div>

                                                )}


                                                {erroTrocaTwitch && (

                                                    <div style={streamerErro}>
                                                        {erroTrocaTwitch}
                                                    </div>

                                                )}


                                                <div style={streamerBotoes}>

                                                    <button

                                                        type="button"

                                                        disabled={
                                                            enviandoTrocaTwitch
                                                        }

                                                        style={streamerBotaoSecundario}

                                                        onClick={
                                                            cancelarTrocaTwitch
                                                        }

                                                    >

                                                        Cancelar

                                                    </button>


                                                    {!aguardandoTrocaTwitch && (

                                                        <button

                                                            type="button"

                                                            disabled={
                                                                enviandoTrocaTwitch
                                                            }

                                                            style={{
                                                                ...streamerBotaoPrincipal,

                                                                opacity:
                                                                    enviandoTrocaTwitch
                                                                        ? 0.6
                                                                        : 1,
                                                            }}

                                                            onClick={
                                                                solicitarTrocaTwitch
                                                            }

                                                        >

                                                            {enviandoTrocaTwitch
                                                                ? "Enviando e-mail..."
                                                                : "Confirmar troca por e-mail →"
                                                            }

                                                        </button>

                                                    )}

                                                </div>

                                            </div>

                                        )}

                                    </div>


                                    <div style={streamerConfigArea}>

                                        <div style={streamerConfigIcone}>
                                            ⚙
                                        </div>


                                        <div>

                                            <div style={streamerConfigTitulo}>
                                                Configurar live
                                            </div>


                                            <div style={streamerConfigTexto}>
                                                Use o botão nativo do Figma ligado à página /configlive para abrir o painel da sua transmissão.
                                            </div>

                                        </div>

                                    </div>

                                </>

                            ) : etapaStreamer === "obrigado" ? (

                                <div style={streamerObrigado}>

                                    <div style={streamerObrigadoIcone}>
                                        ✓
                                    </div>


                                    <div>

                                        <div style={streamerTitulo}>
                                            Obrigado!
                                        </div>


                                        <div style={streamerDescricao}>
                                            {mensagemStreamer ||
                                                "Caso mude de ideia, volte aqui."
                                            }
                                        </div>

                                    </div>

                                </div>

                            ) : etapaStreamer === "twitch" ? (

                                <>

                                    <div style={streamerTag}>
                                        TORNAR-SE STREAMER
                                    </div>


                                    <div style={streamerTituloPergunta}>
                                        Conecte sua Twitch
                                    </div>


                                    <div style={streamerDescricao}>
                                        Informe o link do seu canal da Twitch. A Zytrix criará automaticamente o seu canal e a sua live no banco de dados.
                                    </div>


                                    <label style={streamerLabel}>
                                        LINK DA TWITCH
                                    </label>


                                    <input

                                        type="text"

                                        value={twitchURL}

                                        placeholder="https://www.twitch.tv/seucanal"

                                        onChange={(event) => {

                                            setTwitchURL(
                                                event.target.value
                                            )

                                            setErroStreamer("")

                                        }}

                                        style={streamerInput}

                                    />


                                    {erroStreamer && (

                                        <div style={streamerErro}>
                                            {erroStreamer}
                                        </div>

                                    )}


                                    <div style={streamerBotoes}>

                                        <button

                                            type="button"

                                            disabled={
                                                processandoStreamer
                                            }

                                            style={streamerBotaoSecundario}

                                            onClick={() => {

                                                setEtapaStreamer(
                                                    "pergunta"
                                                )

                                                setErroStreamer("")

                                            }}

                                        >

                                            ← Voltar

                                        </button>


                                        <button

                                            type="button"

                                            disabled={
                                                processandoStreamer
                                            }

                                            style={{
                                                ...streamerBotaoPrincipal,

                                                opacity:
                                                    processandoStreamer
                                                        ? 0.6
                                                        : 1,
                                            }}

                                            onClick={
                                                criarContaStreamer
                                            }

                                        >

                                            {processandoStreamer
                                                ? "Criando canal..."
                                                : "Criar meu canal →"
                                            }

                                        </button>

                                    </div>

                                </>

                            ) : (

                                <>

                                    <div style={streamerTag}>
                                        TRANSMITA NA ZYTRIX
                                    </div>


                                    <div style={streamerTituloPergunta}>
                                        Você deseja fazer lives?
                                    </div>


                                    <div style={streamerDescricao}>
                                        Conecte sua conta da Twitch e transforme sua conta Zytrix em uma conta de streamer.
                                    </div>


                                    {erroStreamer && (

                                        <div style={streamerErro}>
                                            {erroStreamer}
                                        </div>

                                    )}


                                    {mensagemStreamer && (

                                        <div style={streamerSucesso}>
                                            ✓ {mensagemStreamer}
                                        </div>

                                    )}


                                    <div style={streamerOpcoes}>

                                        <button

                                            type="button"

                                            style={streamerOpcaoSim}

                                            onClick={() => {

                                                setEtapaStreamer(
                                                    "twitch"
                                                )

                                                setErroStreamer("")

                                                setMensagemStreamer("")

                                            }}

                                        >

                                            <span style={streamerOpcaoIcone}>
                                                🎥
                                            </span>


                                            <span style={streamerOpcaoConteudo}>

                                                <strong style={streamerOpcaoTitulo}>
                                                    Sim, quero fazer live
                                                </strong>


                                                <span style={streamerOpcaoTexto}>
                                                    Conectar minha Twitch e criar meu canal.
                                                </span>

                                            </span>


                                            <span style={streamerSeta}>
                                                →
                                            </span>

                                        </button>


                                        <button

                                            type="button"

                                            style={streamerOpcaoNao}

                                            onClick={
                                                escolherSomenteAssistir
                                            }

                                        >

                                            <span style={streamerOpcaoIcone}>
                                                👁
                                            </span>


                                            <span style={streamerOpcaoConteudo}>

                                                <strong style={streamerOpcaoTitulo}>
                                                    Não, quero apenas assistir
                                                </strong>


                                                <span style={streamerOpcaoTexto}>
                                                    Você poderá mudar de ideia depois.
                                                </span>

                                            </span>

                                        </button>

                                    </div>

                                </>

                            )}

                        </div>


                        {erro && (

                            <div style={erroStyle}>

                                {erro}

                            </div>

                        )}


                        {mensagem && (

                            <div style={sucessoStyle}>

                                {mensagem}

                            </div>

                        )}

                    </div>

                </div>


                {/* =====================================
                    EDIÇÃO DO PERFIL
                ===================================== */}

                {editando && (

                    <div style={areaEdicao}>


                        <label style={label}>

                            Nome de usuário

                        </label>


                        <input

                            type="text"

                            value={nome}

                            maxLength={30}

                            disabled={
                                !podeAlterarNome()
                            }

                            onChange={(event) =>
                                setNome(
                                    event.target.value
                                )
                            }

                            style={{
                                ...input,

                                opacity:
                                    podeAlterarNome()
                                        ? 1
                                        : 0.5,
                            }}

                        />


                        <div style={ajuda}>

                            O nome pode ser alterado
                            apenas uma vez a cada 7 dias.

                        </div>


                        <label style={label}>

                            Foto de perfil

                        </label>


                        <input

                            type="text"

                            value={foto}

                            placeholder="URL da imagem"

                            onChange={(event) =>
                                setFoto(
                                    event.target.value
                                )
                            }

                            style={input}

                        />


                        <div style={ajuda}>

                            Deixe vazio para usar
                            a foto padrão.

                        </div>


                        <label style={label}>

                            Bio

                        </label>


                        <textarea

                            value={bio}

                            maxLength={500}

                            placeholder="Escreva sua bio..."

                            onChange={(event) =>
                                setBio(
                                    event.target.value
                                )
                            }

                            style={textarea}

                        />


                        <button

                            type="button"

                            disabled={
                                salvando
                            }

                            onClick={
                                salvarPerfil
                            }

                            style={{
                                ...botaoSalvar,

                                opacity:
                                    salvando
                                        ? 0.6
                                        : 1,
                            }}

                        >

                            {salvando
                                ? "Salvando..."
                                : "Salvar alterações"
                            }

                        </button>

                    </div>

                )}

            </div>

        </div>

    )

}


// ==================================================
// ESTILOS
// ==================================================

const pagina: React.CSSProperties = {

    width: "100%",
    height: "100%",

    boxSizing:
        "border-box",

    padding:
        "20px",

    backgroundColor:
        "#07101F",

    color:
        "#FFFFFF",

    fontFamily:
        "Inter, Arial, sans-serif",
}


const card: React.CSSProperties = {

    width:
        "100%",

    boxSizing:
        "border-box",

    padding:
        "20px",

    backgroundColor:
        "#080F1C",

    borderRadius:
        "12px",
}


const titulo: React.CSSProperties = {

    textAlign:
        "center",

    fontSize:
        "42px",

    fontWeight:
        800,

    marginBottom:
        "25px",
}


const linhaPerfil: React.CSSProperties = {

    display:
        "flex",

    alignItems:
        "flex-start",

    gap:
        "18px",

    flexWrap:
        "wrap",
}


const areaFoto: React.CSSProperties = {

    width:
        "120px",

    display:
        "flex",

    flexDirection:
        "column",

    gap:
        "8px",
}


const imagemPerfil: React.CSSProperties = {

    width:
        "120px",

    height:
        "120px",

    objectFit:
        "cover",

    borderRadius:
        "6px",

    backgroundColor:
        "#D1D5DB",
}


const informacoes: React.CSSProperties = {

    flex:
        1,

    minWidth:
        "220px",

    display:
        "flex",

    flexDirection:
        "column",

    gap:
        "12px",

    fontSize:
        "18px",
}


const cooldown: React.CSSProperties = {

    fontSize:
        "12px",

    color:
        "#A5B4FC",
}


// ==================================================
// CONTA
// ==================================================

const categoriaConta: React.CSSProperties = {

    marginTop:
        "6px",

    padding:
        "14px",

    border:
        "1px solid #263244",

    borderRadius:
        "10px",

    backgroundColor:
        "#0D1626",

    fontSize:
        "14px",
}


const tituloCategoria: React.CSSProperties = {

    fontSize:
        "12px",

    fontWeight:
        700,

    color:
        "#A5B4FC",

    marginBottom:
        "12px",

    textTransform:
        "uppercase",

    letterSpacing:
        "0.7px",
}


const linhaConta: React.CSSProperties = {

    display:
        "flex",

    justifyContent:
        "space-between",

    alignItems:
        "center",

    gap:
        "12px",

    flexWrap:
        "wrap",
}


const saldoZyCoins: React.CSSProperties = {

    display:
        "inline-flex",

    alignItems:
        "center",

    gap:
        "5px",

    padding:
        "6px 10px",

    borderRadius:
        "20px",

    backgroundColor:
        "rgba(34, 211, 238, 0.12)",

    border:
        "1px solid rgba(34, 211, 238, 0.30)",

    color:
        "#67E8F9",

    fontSize:
        "13px",

    fontWeight:
        800,
}


const separadorConta: React.CSSProperties = {

    width:
        "100%",

    height:
        "1px",

    backgroundColor:
        "#263244",

    margin:
        "12px 0",
}


const emailTexto: React.CSSProperties = {

    marginTop:
        "4px",

    color:
        "#D1D5DB",

    fontSize:
        "13px",
}


const badgeVerificado: React.CSSProperties = {

    padding:
        "6px 10px",

    borderRadius:
        "20px",

    backgroundColor:
        "rgba(34,197,94,0.15)",

    color:
        "#22C55E",

    fontSize:
        "12px",

    fontWeight:
        700,
}


const badgePendente: React.CSSProperties = {

    padding:
        "6px 10px",

    borderRadius:
        "20px",

    backgroundColor:
        "rgba(245,158,11,0.15)",

    color:
        "#F59E0B",

    fontSize:
        "12px",

    fontWeight:
        700,
}


const areaVerificacao: React.CSSProperties = {

    marginTop:
        "12px",

    paddingTop:
        "12px",

    borderTop:
        "1px solid #263244",

    display:
        "flex",

    flexDirection:
        "column",

    gap:
        "9px",
}


const avisoEmail: React.CSSProperties = {

    color:
        "#D1D5DB",

    fontSize:
        "12px",

    lineHeight:
        1.5,
}


const botoesEmail: React.CSSProperties = {

    display:
        "flex",

    gap:
        "8px",

    flexWrap:
        "wrap",
}


const botaoVerificacao: React.CSSProperties = {

    height:
        "34px",

    padding:
        "0 12px",

    border:
        "none",

    borderRadius:
        "7px",

    backgroundColor:
        "#7C3AED",

    color:
        "#FFFFFF",

    fontSize:
        "12px",

    fontWeight:
        600,

    cursor:
        "pointer",
}


const botaoJaVerifiquei: React.CSSProperties = {

    height:
        "34px",

    padding:
        "0 12px",

    border:
        "1px solid #374151",

    borderRadius:
        "7px",

    backgroundColor:
        "#111827",

    color:
        "#FFFFFF",

    fontSize:
        "12px",

    fontWeight:
        600,

    cursor:
        "pointer",
}


const sucessoEmail: React.CSSProperties = {

    color:
        "#22C55E",

    fontSize:
        "12px",
}


const erroEmailStyle: React.CSSProperties = {

    color:
        "#EF4444",

    fontSize:
        "12px",
}


// ==================================================
// RESTANTE
// ==================================================

const bioVisual: React.CSSProperties = {

    marginTop:
        "8px",

    lineHeight:
        1.5,
}


const botaoEditar: React.CSSProperties = {

    width:
        "120px",

    height:
        "36px",

    border:
        "none",

    borderRadius:
        "7px",

    backgroundColor:
        "#7C3AED",

    color:
        "#FFFFFF",

    cursor:
        "pointer",
}


const botaoId: React.CSSProperties = {

    width:
        "120px",

    height:
        "32px",

    border:
        "1px solid #374151",

    borderRadius:
        "7px",

    backgroundColor:
        "#111827",

    color:
        "#FFFFFF",

    cursor:
        "pointer",
}


const areaEdicao: React.CSSProperties = {

    marginTop:
        "25px",

    paddingTop:
        "20px",

    borderTop:
        "1px solid #263244",

    display:
        "flex",

    flexDirection:
        "column",

    gap:
        "10px",
}


const label: React.CSSProperties = {

    fontSize:
        "14px",

    fontWeight:
        600,
}


const input: React.CSSProperties = {

    width:
        "100%",

    height:
        "44px",

    boxSizing:
        "border-box",

    padding:
        "0 12px",

    border:
        "1px solid #374151",

    borderRadius:
        "8px",

    backgroundColor:
        "#111827",

    color:
        "#FFFFFF",

    fontSize:
        "14px",
}


const textarea: React.CSSProperties = {

    width:
        "100%",

    minHeight:
        "100px",

    boxSizing:
        "border-box",

    padding:
        "12px",

    border:
        "1px solid #374151",

    borderRadius:
        "8px",

    backgroundColor:
        "#111827",

    color:
        "#FFFFFF",

    resize:
        "vertical",

    fontFamily:
        "Inter, Arial, sans-serif",

    fontSize:
        "14px",
}


const ajuda: React.CSSProperties = {

    fontSize:
        "12px",

    color:
        "#9CA3AF",
}


const botaoSalvar: React.CSSProperties = {

    width:
        "100%",

    height:
        "46px",

    marginTop:
        "8px",

    border:
        "none",

    borderRadius:
        "8px",

    backgroundColor:
        "#7C3AED",

    color:
        "#FFFFFF",

    fontSize:
        "15px",

    fontWeight:
        600,

    cursor:
        "pointer",
}


// ==================================================
// STREAMER
// ==================================================

const areaStreamerPerfil: React.CSSProperties = {

    marginTop:
        "14px",

    padding:
        "16px",

    border:
        "1px solid #263244",

    borderRadius:
        "10px",

    backgroundColor:
        "#0D1626",
}


const streamerCabecalho: React.CSSProperties = {

    display:
        "flex",

    alignItems:
        "center",

    gap:
        "10px",

    flexWrap:
        "wrap",
}


const streamerIcone: React.CSSProperties = {

    width:
        "42px",

    height:
        "42px",

    display:
        "flex",

    alignItems:
        "center",

    justifyContent:
        "center",

    borderRadius:
        "9px",

    backgroundColor:
        "#142C3D",

    fontSize:
        "20px",
}


const streamerCabecalhoTexto: React.CSSProperties = {

    flex:
        1,

    minWidth:
        "140px",
}


const streamerTag: React.CSSProperties = {

    color:
        "#58C8ED",

    fontSize:
        "10px",

    fontWeight:
        800,

    letterSpacing:
        "0.8px",
}


const streamerTitulo: React.CSSProperties = {

    marginTop:
        "3px",

    color:
        "#FFFFFF",

    fontSize:
        "16px",

    fontWeight:
        800,
}


const streamerTituloPergunta: React.CSSProperties = {

    marginTop:
        "7px",

    color:
        "#FFFFFF",

    fontSize:
        "18px",

    fontWeight:
        800,
}


const streamerDescricao: React.CSSProperties = {

    marginTop:
        "7px",

    color:
        "#9CA3AF",

    fontSize:
        "12px",

    lineHeight:
        1.5,
}


const streamerStatusOffline: React.CSSProperties = {

    padding:
        "6px 9px",

    borderRadius:
        "20px",

    backgroundColor:
        "rgba(107,114,128,0.14)",

    color:
        "#9CA3AF",

    fontSize:
        "10px",

    fontWeight:
        800,
}


const streamerStatusLive: React.CSSProperties = {

    ...streamerStatusOffline,

    backgroundColor:
        "rgba(225,29,72,0.14)",

    color:
        "#FB7185",
}


const streamerTwitch: React.CSSProperties = {

    marginTop:
        "10px",

    padding:
        "9px 10px",

    borderRadius:
        "7px",

    backgroundColor:
        "#09121B",

    color:
        "#A78BFA",

    fontSize:
        "11px",

    overflowWrap:
        "anywhere",
}


const streamerConfigArea: React.CSSProperties = {

    marginTop:
        "12px",

    display:
        "flex",

    alignItems:
        "center",

    gap:
        "10px",

    padding:
        "11px",

    border:
        "1px solid rgba(88,200,237,.25)",

    borderRadius:
        "8px",

    backgroundColor:
        "rgba(88,200,237,.06)",
}


const streamerConfigIcone: React.CSSProperties = {

    color:
        "#58C8ED",

    fontSize:
        "20px",
}


const streamerConfigTitulo: React.CSSProperties = {

    color:
        "#FFFFFF",

    fontSize:
        "12px",

    fontWeight:
        800,
}


const streamerConfigTexto: React.CSSProperties = {

    marginTop:
        "2px",

    color:
        "#7D8B9B",

    fontSize:
        "10px",

    lineHeight:
        1.4,
}


const streamerLabel: React.CSSProperties = {

    display:
        "block",

    marginTop:
        "14px",

    marginBottom:
        "6px",

    color:
        "#A5B4FC",

    fontSize:
        "10px",

    fontWeight:
        700,
}


const streamerInput: React.CSSProperties = {

    width:
        "100%",

    height:
        "42px",

    boxSizing:
        "border-box",

    padding:
        "0 11px",

    border:
        "1px solid #374151",

    borderRadius:
        "8px",

    backgroundColor:
        "#111827",

    color:
        "#FFFFFF",

    outline:
        "none",

    fontSize:
        "12px",
}


const streamerBotoes: React.CSSProperties = {

    marginTop:
        "12px",

    display:
        "flex",

    justifyContent:
        "flex-end",

    gap:
        "8px",

    flexWrap:
        "wrap",
}


const streamerBotaoPrincipal: React.CSSProperties = {

    minHeight:
        "38px",

    padding:
        "0 13px",

    border:
        "none",

    borderRadius:
        "7px",

    backgroundColor:
        "#58C8ED",

    color:
        "#061019",

    cursor:
        "pointer",

    fontSize:
        "11px",

    fontWeight:
        800,
}


const streamerBotaoSecundario: React.CSSProperties = {

    minHeight:
        "38px",

    padding:
        "0 13px",

    border:
        "1px solid #374151",

    borderRadius:
        "7px",

    backgroundColor:
        "#111827",

    color:
        "#FFFFFF",

    cursor:
        "pointer",

    fontSize:
        "11px",

    fontWeight:
        600,
}


const streamerErro: React.CSSProperties = {

    marginTop:
        "10px",

    padding:
        "8px 10px",

    borderRadius:
        "7px",

    backgroundColor:
        "rgba(239,68,68,0.08)",

    border:
        "1px solid rgba(239,68,68,0.25)",

    color:
        "#F87171",

    fontSize:
        "11px",
}


const streamerSucesso: React.CSSProperties = {

    marginTop:
        "10px",

    padding:
        "8px 10px",

    borderRadius:
        "7px",

    backgroundColor:
        "rgba(34,197,94,0.08)",

    border:
        "1px solid rgba(34,197,94,0.25)",

    color:
        "#4ADE80",

    fontSize:
        "11px",
}


const streamerOpcoes: React.CSSProperties = {

    marginTop:
        "13px",

    display:
        "grid",

    gridTemplateColumns:
        "repeat(2, minmax(0, 1fr))",

    gap:
        "9px",
}


const streamerOpcaoSim: React.CSSProperties = {

    minHeight:
        "76px",

    display:
        "flex",

    alignItems:
        "center",

    gap:
        "9px",

    padding:
        "11px",

    border:
        "1px solid #2C4B60",

    borderRadius:
        "9px",

    backgroundColor:
        "#101D2A",

    color:
        "#FFFFFF",

    textAlign:
        "left",

    cursor:
        "pointer",
}


const streamerOpcaoNao: React.CSSProperties = {

    ...streamerOpcaoSim,

    border:
        "1px solid #303B49",

    backgroundColor:
        "#101824",
}


const streamerOpcaoIcone: React.CSSProperties = {

    fontSize:
        "20px",
}


const streamerOpcaoConteudo: React.CSSProperties = {

    flex:
        1,

    minWidth:
        0,

    display:
        "flex",

    flexDirection:
        "column",

    gap:
        "3px",
}


const streamerOpcaoTitulo: React.CSSProperties = {

    color:
        "#FFFFFF",

    fontSize:
        "11px",
}


const streamerOpcaoTexto: React.CSSProperties = {

    color:
        "#8B99AA",

    fontSize:
        "9px",

    lineHeight:
        1.35,
}


const streamerSeta: React.CSSProperties = {

    color:
        "#58C8ED",

    fontSize:
        "17px",
}


const streamerObrigado: React.CSSProperties = {

    display:
        "flex",

    alignItems:
        "center",

    gap:
        "11px",
}


const streamerObrigadoIcone: React.CSSProperties = {

    width:
        "38px",

    height:
        "38px",

    display:
        "flex",

    alignItems:
        "center",

    justifyContent:
        "center",

    borderRadius:
        "50%",

    backgroundColor:
        "#58C8ED",

    color:
        "#061019",

    fontWeight:
        900,
}


const streamerTwitchArea: React.CSSProperties = {

    marginTop:
        "12px",

    padding:
        "11px",

    border:
        "1px solid #263244",

    borderRadius:
        "9px",

    backgroundColor:
        "#0B1421",
}


const streamerTwitchLinha: React.CSSProperties = {

    display:
        "flex",

    alignItems:
        "center",

    justifyContent:
        "space-between",

    gap:
        "12px",

    flexWrap:
        "wrap",
}


const streamerTwitchDados: React.CSSProperties = {

    flex:
        1,

    minWidth:
        "180px",
}


const streamerTwitchLabel: React.CSSProperties = {

    color:
        "#718096",

    fontSize:
        "8px",

    fontWeight:
        800,

    letterSpacing:
        "0.8px",
}


const streamerBotaoAlterarTwitch: React.CSSProperties = {

    minHeight:
        "32px",

    padding:
        "0 11px",

    border:
        "1px solid rgba(88,200,237,0.35)",

    borderRadius:
        "7px",

    backgroundColor:
        "rgba(88,200,237,0.08)",

    color:
        "#58C8ED",

    fontSize:
        "10px",

    fontWeight:
        700,

    cursor:
        "pointer",
}


const streamerTrocaTwitchArea: React.CSSProperties = {

    marginTop:
        "12px",

    paddingTop:
        "12px",

    borderTop:
        "1px solid #263244",
}


const streamerTrocaAviso: React.CSSProperties = {

    marginBottom:
        "12px",

    padding:
        "9px 10px",

    borderRadius:
        "7px",

    backgroundColor:
        "rgba(88,200,237,0.06)",

    color:
        "#B6C5D4",

    fontSize:
        "9px",

    lineHeight:
        1.45,
}


const erroStyle: React.CSSProperties = {

    color:
        "#EF4444",

    fontSize:
        "13px",
}


const sucessoStyle: React.CSSProperties = {

    color:
        "#22C55E",

    fontSize:
        "13px",
}