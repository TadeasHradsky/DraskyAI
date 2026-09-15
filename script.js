document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // DOM ELEMENTY
    // ==========================================

    const pozdravElement = document.getElementById('pozdrav');
    const formElement = document.getElementById('ollamaForm');
    const promptInput = document.getElementById('prompt');
    const odeslatBtn = document.getElementById('odeslat');
    const chatHistory = document.getElementById('chatHistory');
    const welcomeSection = document.getElementById('welcomeSection');
    const chatContainer = document.querySelector('.chat-container');

    // Sidebar & Overlay
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const newChatBtn = document.getElementById('newChatBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const historyList = document.getElementById('historyList');


    // ==========================================
    // OLLAMA NASTAVENÍ
    // ==========================================

    const OLLAMA_URL = 'http://100.114.235.3:11434/api/generate';
    const MODEL_NAME = 'gemma2:2b';


    // ==========================================
    // CHATY
    // ==========================================
    

    let chats = JSON.parse(
        localStorage.getItem('drasky_chat_sessions')
    ) || [];

    let currentChatId = null;


    // ==========================================
    // POZDRAV PODLE ČASU
    // ==========================================

    function nastavitPozdrav() {
        const hodina = new Date().getHours();

        let text = "Ahoj!";

        if (hodina >= 4 && hodina < 9) {
            text = "Dobré ráno!";
        }
        else if (hodina >= 9 && hodina < 12) {
            text = "Krásné dopoledne!";
        }
        else if (hodina >= 12 && hodina < 17) {
            text = "Dobré odpoledne!";
        }
        else if (hodina >= 17 && hodina < 22) {
            text = "Dobrý večer!";
        }
        else {
            text = "Dobrou noc!";
        }

        if (pozdravElement) {
            pozdravElement.innerText = text;
        }
    }


    // ==========================================
    // AKTUÁLNÍ ČAS
    // ==========================================

    function ziskejAktualniCasContext() {
        const now = new Date();

        const dny = [
            'Neděle',
            'Pondělí',
            'Úterý',
            'Středa',
            'Čtvrtek',
            'Pátek',
            'Sobota'
        ];

        const denNazev = dny[now.getDay()];

        const datumStr = now.toLocaleDateString(
            'cs-CZ',
            {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }
        );

        const casStr = now.toLocaleTimeString(
            'cs-CZ',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        );

        return `Dnes je ${denNazev}, ${datumStr}. Aktuální čas je ${casStr}.`;
    }


    // ==========================================
    // VYTVOŘENÍ HISTORIE PRO AI
    // ==========================================

    function sestavHistoriiKonverzace(messages) {

        if (!messages || messages.length === 0) {
            return '';
        }

        // Posledních 30 zpráv.
        // Tím zabráníme tomu, aby se prompt postupně
        // stal obrovským.
        const posledniZpravy = messages.slice(-30);

        return posledniZpravy
            .map(message => {

                const autor =
                    message.type === 'user'
                        ? 'Drasky'
                        : 'Aeris';

                return `${autor}: ${message.text}`;
            })
            .join('\n\n');
    }


    // ==========================================
    // ULOŽENÍ CHATŮ
    // ==========================================

    function ulozDoLocalStorage() {

        localStorage.setItem(
            'drasky_chat_sessions',
            JSON.stringify(chats)
        );
    }


    // ==========================================
    // SKRYTÍ / ZOBRAZENÍ ÚVODU
    // ==========================================

    function skrytUvod() {

        if (welcomeSection) {
            welcomeSection.classList.add('hidden');
        }
    }


    function zobrazUvod() {

        if (welcomeSection) {
            welcomeSection.classList.remove('hidden');
        }
    }


    // ==========================================
    // VYKRESLENÍ ZPRÁVY
    // ==========================================

    function vykreslitZpravu(autor, text, typ) {

        skrytUvod();

        const messageDiv = document.createElement('div');

        messageDiv.classList.add(
            'message',
            typ
        );


        // Autor
        const authorDiv = document.createElement('div');

        authorDiv.classList.add('author');

        authorDiv.textContent = autor;


        // Bublina
        const bubbleDiv = document.createElement('div');

        bubbleDiv.classList.add('bubble');


        // AI zpráva
        if (typ === 'ai') {

            if (typeof marked !== 'undefined') {

                bubbleDiv.innerHTML = marked.parse(text);

            }
            else {

                bubbleDiv.textContent = text;

            }


            // Highlight.js
            if (window.hljs) {

                bubbleDiv
                    .querySelectorAll('pre code')
                    .forEach((block) => {

                        hljs.highlightElement(block);

                    });

            }

        }

        // Uživatelská zpráva
        else {

            bubbleDiv.textContent = text;

        }


        messageDiv.appendChild(authorDiv);

        messageDiv.appendChild(bubbleDiv);

        chatHistory.appendChild(messageDiv);


        // Scroll dolů
        if (chatContainer) {

            chatContainer.scrollTop =
                chatContainer.scrollHeight;

        }


        return bubbleDiv;
    }


    // ==========================================
    // SYSTEM PROMPT
    // ==========================================

    function vytvorSystemPrompt(activeChat) {

        const casovyKontext =
            ziskejAktualniCasContext();


        // Historie aktuálního chatu
        const historie =
            sestavHistoriiKonverzace(
                activeChat?.messages || []
            );


        let systemPrompt = `
Jmenuješ se Aeris.

Uživatel se jmenuje Drasky.

Jsi osobní AI asistent vytvořený Draskym.

Vždy uživatele oslovuj „Drasky“, pokud je oslovení vhodné.

Jsi expert na:
- HTML5
- CSS3
- JavaScript
- UI/UX
- programování
- vývoj webových aplikací
- práci s Ollamou a lokální AI

KONTEXT DATA A ČASU:
${casovyKontext}

PRAVIDLA:

1. Odpovídej vždy česky, pokud Drasky píše česky.

2. Odpovídej přirozeně, srozumitelně a konkrétně.

3. Nevymýšlej si fakta.

4. Pokud něco nevíš, řekni, že to nevíš.

5. Informace z historie konverzace používej jako kontext.

6. Nezaměňuj informace z historie za nové otázky.

7. Pokud Drasky navazuje na předchozí zprávu, použij historii k pochopení souvislosti.

8. Pokud je otázka nejasná, raději požádej o upřesnění.

9. Používej Markdown.

10. Pro důležité věci používej **tučné písmo**.

11. Pro seznamy používej:
- odrážky
- nebo číslované seznamy

12. Používej nadpisy ## a ### tam, kde to pomůže přehlednosti.

13. PŘI PSANÍ KÓDU:
- vždy používej trojité zpětné uvozovky
- vždy označ jazyk, například \`\`\`html nebo \`\`\`javascript
- piš čistý a moderní kód
- používej krátké komentáře
- neskrývej důležité části kódu

14. Neříkej, že něco víš z paměti, pokud to skutečně není v poskytnuté historii.

15. Jsi Aeris, ne Drasky.

16. Drasky je uživatel, Aeris je AI asistent.
`;


        // ==========================================
        // PŘIDÁNÍ HISTORIE
        // ==========================================

        if (historie) {

            systemPrompt += `

PAMĚŤ AKTUÁLNÍ KONVERZACE:

Níže je historie posledních zpráv této konverzace.

Použij ji jako kontext pro odpověď.
Neopakuj ji celou.
Pokračuj přirozeně v rozhovoru.

--- ZAČÁTEK HISTORIE ---

${historie}

--- KONEC HISTORIE ---
`;

        }


        return systemPrompt;
    }


    // ==========================================
    // ODESLÁNÍ DOTAZU DO OLLAMY
    // ==========================================

    if (formElement) {

        formElement.addEventListener(
            'submit',
            async (e) => {

                e.preventDefault();


                // ------------------------------
                // Získání dotazu
                // ------------------------------

                const dotaz =
                    promptInput.value.trim();


                if (!dotaz) {
                    return;
                }


                // ------------------------------
                // Vytvoření nového chatu
                // ------------------------------

                if (!currentChatId) {

                    const newChat = {

                        id: Date.now().toString(),

                        title:
                            dotaz.length > 25
                                ? dotaz.substring(0, 25) + '...'
                                : dotaz,

                        messages: []

                    };


                    chats.unshift(newChat);

                    currentChatId =
                        newChat.id;
                }


                // ------------------------------
                // Aktivní chat
                // ------------------------------

                const activeChat =
                    chats.find(
                        chat =>
                            chat.id === currentChatId
                    );


                if (!activeChat) {

                    console.error(
                        'Aktivní chat nebyl nalezen.'
                    );

                    return;
                }


                // ------------------------------
                // Přidání zprávy uživatele
                // ------------------------------

                activeChat.messages.push({

                    author: 'TY',

                    text: dotaz,

                    type: 'user'

                });


                // Zobrazení zprávy
                vykreslitZpravu(
                    'TY',
                    dotaz,
                    'user'
                );


                // Uložení okamžitě po zprávě
                ulozDoLocalStorage();


                // Vyčištění inputu
                promptInput.value = '';


                // Deaktivace tlačítka
                if (odeslatBtn) {
                    odeslatBtn.disabled = true;
                }


                // ------------------------------
                // Loading
                // ------------------------------

                const nacteniBublina =
                    vykreslitZpravu(
                        'AERIS',
                        'Přemýšlím...',
                        'ai'
                    );


                // ------------------------------
                // System prompt + historie
                // ------------------------------

                const systemPrompt =
                    vytvorSystemPrompt(
                        activeChat
                    );


                // ==========================================
                // OLLAMA REQUEST
                // ==========================================

                try {

                    const response =
                        await fetch(
                            OLLAMA_URL,
                            {

                                method: 'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },

                                body:
                                    JSON.stringify({

                                        model:
                                            MODEL_NAME,

                                        system:
                                            systemPrompt,

                                        prompt:
                                            dotaz,

                                        stream:
                                            false

                                    })

                            }
                        );


                    // ------------------------------
                    // Kontrola HTTP odpovědi
                    // ------------------------------

                    if (!response.ok) {

                        throw new Error(
                            `Ollama HTTP chyba: ${response.status}`
                        );

                    }


                    // ------------------------------
                    // JSON odpověď
                    // ------------------------------

                    const data =
                        await response.json();


                    const aiOdpoved =
                        data.response;


                    if (!aiOdpoved) {

                        throw new Error(
                            'Ollama nevrátila žádnou odpověď.'
                        );

                    }


                    // ------------------------------
                    // Zobrazení AI odpovědi
                    // ------------------------------

                    if (
                        typeof marked !== 'undefined'
                    ) {

                        nacteniBublina.innerHTML =
                            marked.parse(
                                aiOdpoved
                            );

                    }
                    else {

                        nacteniBublina.textContent =
                            aiOdpoved;

                    }


                    // ------------------------------
                    // Highlight.js
                    // ------------------------------

                    if (window.hljs) {

                        nacteniBublina
                            .querySelectorAll('pre code')
                            .forEach((block) => {

                                hljs.highlightElement(
                                    block
                                );

                            });

                    }


                    // ------------------------------
                    // Uložení AI odpovědi
                    // ------------------------------

                    activeChat.messages.push({

                        author: 'AERIS',

                        text: aiOdpoved,

                        type: 'ai'

                    });


                    // Uložení
                    ulozDoLocalStorage();


                    // Aktualizace sidebaru
                    nactiHistoriiGUI();


                }
                catch (error) {

                    console.error(
                        'Chyba Ollama:',
                        error
                    );


                    nacteniBublina.innerHTML = `
                        <span style="color: #ff6b6b;">
                            Chyba: Nepodařilo se spojit s Ollamou.<br><br>
                            Zkontroluj, že Ollama běží a že je dostupná adresa:<br>
                            ${OLLAMA_URL}
                        </span>
                    `;

                }
                finally {

                    // Aktivace tlačítka
                    if (odeslatBtn) {
                        odeslatBtn.disabled = false;
                    }


                    // Focus zpět do inputu
                    if (promptInput) {
                        promptInput.focus();
                    }


                    // Scroll dolů
                    if (chatContainer) {

                        chatContainer.scrollTop =
                            chatContainer.scrollHeight;

                    }

                }

            }
        );

    }


    // ==========================================
    // NAČTENÍ KONKRÉTNÍHO CHATU
    // ==========================================

    function nactiKonkretniChat(chatId) {

        currentChatId = chatId;


        // Vyčistit aktuální chat
        chatHistory.innerHTML = '';


        // Najít chat
        const activeChat =
            chats.find(
                chat => chat.id === chatId
            );


        if (
            activeChat &&
            activeChat.messages &&
            activeChat.messages.length > 0
        ) {

            skrytUvod();


            activeChat.messages.forEach(
                message => {

                    vykreslitZpravu(
                        message.author,
                        message.text,
                        message.type
                    );

                }
            );

        }
        else {

            zobrazUvod();

        }


        // Aktualizace sidebaru
        nactiHistoriiGUI();


        // Zavřít sidebar
        zavritSidebar();

    }


    // ==========================================
    // SMAZÁNÍ JEDNOHO CHATU
    // ==========================================

    function smazJednotlivyChat(
        chatId,
        e
    ) {

        e.stopPropagation();


        chats =
            chats.filter(
                chat => chat.id !== chatId
            );


        ulozDoLocalStorage();


        // Pokud jsme smazali právě otevřený chat
        if (currentChatId === chatId) {

            vytvorNovyChat();

        }
        else {

            nactiHistoriiGUI();

        }

    }


    // ==========================================
    // VYKRESLENÍ HISTORIE CHATŮ
    // ==========================================

    function nactiHistoriiGUI() {

        if (!historyList) {
            return;
        }


        historyList.innerHTML = '';


        chats.forEach(
            chat => {

                const wrapper =
                    document.createElement(
                        'div'
                    );

                wrapper.classList.add(
                    'history-item-wrapper'
                );


                // Aktivní chat
                if (
                    chat.id === currentChatId
                ) {

                    wrapper.classList.add(
                        'active'
                    );

                }


                // ------------------------------
                // Tlačítko chatu
                // ------------------------------

                const btn =
                    document.createElement(
                        'button'
                    );

                btn.classList.add(
                    'history-item-btn'
                );

                btn.textContent =
                    chat.title;


                btn.addEventListener(
                    'click',
                    () =>
                        nactiKonkretniChat(
                            chat.id
                        )
                );


                // ------------------------------
                // Delete button
                // ------------------------------

                const delBtn =
                    document.createElement(
                        'button'
                    );

                delBtn.classList.add(
                    'delete-single-chat'
                );


                delBtn.setAttribute(
                    'title',
                    'Smazat chat'
                );


                delBtn.innerHTML = `
                    <span class="material-symbols-outlined">
                        delete
                    </span>
                `;


                delBtn.addEventListener(
                    'click',
                    (e) =>
                        smazJednotlivyChat(
                            chat.id,
                            e
                        )
                );


                // ------------------------------
                // Přidání do DOM
                // ------------------------------

                wrapper.appendChild(btn);

                wrapper.appendChild(delBtn);

                historyList.appendChild(wrapper);

            }
        );

    }


    // ==========================================
    // NOVÝ CHAT
    // ==========================================

    function vytvorNovyChat() {

        currentChatId = null;


        // Vyčistit chat
        chatHistory.innerHTML = '';


        // Zobrazit welcome
        zobrazUvod();


        // Aktualizovat historii
        nactiHistoriiGUI();


        // Zavřít sidebar
        zavritSidebar();

    }


    // ==========================================
    // SIDEBAR
    // ==========================================

    function otvritSidebar() {

        if (sidebar) {

            sidebar.classList.add(
                'open'
            );

        }


        if (sidebarOverlay) {

            sidebarOverlay.classList.add(
                'active'
            );

        }

    }


    function zavritSidebar() {

        if (sidebar) {

            sidebar.classList.remove(
                'open'
            );

        }


        if (sidebarOverlay) {

            sidebarOverlay.classList.remove(
                'active'
            );

        }

    }


    // Otevřít
    if (openSidebarBtn) {

        openSidebarBtn.addEventListener(
            'click',
            otvritSidebar
        );

    }


    // Zavřít
    if (closeSidebarBtn) {

        closeSidebarBtn.addEventListener(
            'click',
            zavritSidebar
        );

    }


    // Kliknutí mimo sidebar
    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            'click',
            zavritSidebar
        );

    }


    // ==========================================
    // VYMAZAT VŠECHNY CHATY
    // ==========================================

    if (clearHistoryBtn) {

        clearHistoryBtn.addEventListener(
            'click',
            () => {

                chats = [];


                localStorage.removeItem(
                    'drasky_chat_sessions'
                );


                vytvorNovyChat();

            }
        );

    }


    // ==========================================
    // NOVÝ CHAT BUTTON
    // ==========================================

    if (newChatBtn) {

        newChatBtn.addEventListener(
            'click',
            vytvorNovyChat
        );

    }


    // ==========================================
    // START
    // ==========================================

    nastavitPozdrav();

    nactiHistoriiGUI();

});