document.addEventListener('DOMContentLoaded', () => {
    // DOM elementy
    const pozdravElement = document.getElementById('pozdrav');
    const formElement = document.getElementById('ollamaForm');
    const promptInput = document.getElementById('prompt');
    const odeslatBtn = document.getElementById('odeslat');
    const chatHistory = document.getElementById('chatHistory');
    const welcomeSection = document.getElementById('welcomeSection');
    const chatContainer = document.querySelector('.chat-container');

    // Sidebar & Overlay elementy
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const newChatBtn = document.getElementById('newChatBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const historyList = document.getElementById('historyList');

    const OLLAMA_URL = 'https://architects-atmosphere-prefix-bras.trycloudflare.com/api/generate';
    const MODEL_NAME = 'gemma2:2b';

    // Struktura chatů: [{ id, title, messages: [{ author, text, type }] }]
    let chats = JSON.parse(localStorage.getItem('drasky_chat_sessions')) || [];
    let currentChatId = null;

    // 1. Pozdrav podle času
    function nastavitPozdrav() {
        const hodina = new Date().getHours();
        let text = "Ahoj!";

        if (hodina >= 4 && hodina < 9) text = "Dobré ráno Drasky!";
        else if (hodina >= 9 && hodina < 12) text = "Krásné dopoledne Drasky!";
        else if (hodina >= 12 && hodina < 17) text = "Dobré odpoledne Drasky!";
        else if (hodina >= 17 && hodina < 22) text = "Dobrý večer Drasky!";
        else text = "Dobrou noc!";

        if (pozdravElement) pozdravElement.innerText = text;
    }

    nastavitPozdrav();
    nactiHistoriiGUI();

    // 2. Ovládání mobilního Sidebaru (Menu)
    function otvritSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    }

    function zavritSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', otvritSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', zavritSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', zavritSidebar);

    // 3. Skrytí / Zobrazení úvodní sekce
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

    // 4. Vykreslení jedné zprávy do chatu
    function vykreslitZpravu(autor, text, typ) {
        skrytUvod();

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', typ);

        const authorDiv = document.createElement('div');
        authorDiv.classList.add('author');
        authorDiv.textContent = autor;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('bubble');

        if (typ === 'ai') {
            bubbleDiv.innerHTML = marked.parse(text);
        } else {
            bubbleDiv.textContent = text;
        }

        messageDiv.appendChild(authorDiv);
        messageDiv.appendChild(bubbleDiv);
        chatHistory.appendChild(messageDiv);

        chatContainer.scrollTop = chatContainer.scrollHeight;

        return bubbleDiv;
    }

    // 5. Obsluha odeslání dotazu
    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dotaz = promptInput.value.trim();
        if (!dotaz) return;

        // Pokud ještě nemáme aktivní chat, vytvoříme nový
        if (!currentChatId) {
            const newChat = {
                id: Date.now().toString(),
                title: dotaz.length > 25 ? dotaz.substring(0, 25) + '...' : dotaz,
                messages: []
            };
            chats.unshift(newChat);
            currentChatId = newChat.id;
        }

        const activeChat = chats.find(c => c.id === currentChatId);

        // Uložení a vykreslení dotazu uživatele
        activeChat.messages.push({ author: 'TY', text: dotaz, type: 'user' });
        vykreslitZpravu('TY', dotaz, 'user');

        promptInput.value = '';
        odeslatBtn.disabled = true;

        // Vykreslení načítání AI
        const nacteniBublina = vykreslitZpravu('AERIS', 'Přemýšlím...', 'ai');

        try {
            const response = await fetch(OLLAMA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    system: `Jmenuješ se Aeris.

Uživatel se jmenuje Drasky.
Vždy uživatele oslovuj „Drasky“, pokud je oslovení vhodné.

Jsi osobní AI asistent vytvořený Draskym.

Odpovídej česky, pokud uživatel píše česky.

Odpovídej přirozeně a srozumitelně.
Nevymýšlej si fakta.
Pokud něco nevíš, řekni, že to nevíš.

Informace z paměti používej pouze jako fakta.
Nevytvářej z nich smyšlené vlastnosti nebo události.`,
                    prompt: dotaz,
                    stream: false
                })
            });
            if (!response.ok) throw new Error('Nelze se spojit s AI serverem.');

            const data = await response.json();

            // Nahrazení textu s načítáním za reálnou AI odpověď
            nacteniBublina.innerHTML = marked.parse(data.response);

            // Uložení AI odpovědi do aktivního chatu
            activeChat.messages.push({ author: 'DRASKY AI', text: data.response, type: 'ai' });

            ulozDoLocalStorage();
            nactiHistoriiGUI();

        } catch (error) {
            console.error(error);
            nacteniBublina.innerHTML = `<span style="color: #ff6b6b;">Chyba: Ujisti se, že ti na pozadí běží Ollama.</span>`;
        } finally {
            odeslatBtn.disabled = false;
            promptInput.focus();
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    // 6. Načtení konkrétního chatu po kliknutí v menu
    function nactiKonkretniChat(chatId) {
        currentChatId = chatId;
        chatHistory.innerHTML = '';

        const activeChat = chats.find(c => c.id === chatId);
        if (activeChat && activeChat.messages.length > 0) {
            skrytUvod();
            activeChat.messages.forEach(m => {
                vykreslitZpravu(m.author, m.text, m.type);
            });
        } else {
            zobrazUvod();
        }

        nactiHistoriiGUI();
        zavritSidebar();
    }

    // 7. Smazání jednoho chatu
    function smazJednotlivyChat(chatId, e) {
        e.stopPropagation(); // Zamezí otevření chatu při kliknutí na ikonu smazání

        chats = chats.filter(c => c.id !== chatId);
        ulozDoLocalStorage();

        if (currentChatId === chatId) {
            vytvorNovyChat();
        } else {
            nactiHistoriiGUI();
        }
    }

    // 8. Správa uložení a zobrazení v menu
    function ulozDoLocalStorage() {
        localStorage.setItem('drasky_chat_sessions', JSON.stringify(chats));
    }

    function nactiHistoriiGUI() {
        historyList.innerHTML = '';

        chats.forEach((chat) => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('history-item-wrapper');
            if (chat.id === currentChatId) {
                wrapper.classList.add('active');
            }

            const btn = document.createElement('button');
            btn.classList.add('history-item-btn');
            btn.textContent = chat.title;
            btn.addEventListener('click', () => nactiKonkretniChat(chat.id));

            const delBtn = document.createElement('button');
            delBtn.classList.add('delete-single-chat');
            delBtn.setAttribute('title', 'Smazat chat');
            delBtn.innerHTML = `<span class="material-symbols-outlined">delete</span>`;
            delBtn.addEventListener('click', (e) => smazJednotlivyChat(chat.id, e));

            wrapper.appendChild(btn);
            wrapper.appendChild(delBtn);
            historyList.appendChild(wrapper);
        });
    }

    function vytvorNovyChat() {
        currentChatId = null;
        chatHistory.innerHTML = '';
        zobrazUvod();
        nactiHistoriiGUI();
        zavritSidebar();
    }

    // Tlačítko Vymazat VŠECHNO
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            chats = [];
            localStorage.removeItem('drasky_chat_sessions');
            vytvorNovyChat();
        });
    }

    // Tlačítko Nový chat
    if (newChatBtn) {
        newChatBtn.addEventListener('click', vytvorNovyChat);
    }
});