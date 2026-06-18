// ============================================================
//  pages/room.js  —  Sala de chat con un personaje
//  La página más compleja: historial, AI, alternativas, personas,
//  memoria resumida, edición y borrado de mensajes.
// ============================================================

import { _supabase, imgUrl } from '../supabase.js';
import { Auth }      from '../auth.js';
import { Router }    from '../router.js';

export function render() {
    return `
    <style>
        /* ── Layout ─────────────────────────────────────────── */
        body { padding-bottom: 0 !important; }
        /* Borde derivado del color de texto del tema activo */
        :root, body { --border-color: rgba(62,83,43,0.2); }
        body.theme-dark { --border-color: rgba(158,169,63,0.2); }

        .chat-header {
            background-color: var(--bg-accent);
            border-bottom: 1px solid var(--border-color);
            padding: 10px 14px;
            display: flex; align-items: center;
            justify-content: space-between;
            position: fixed; top: 0; left: 0; right: 0;
            z-index: 100; height: 58px;
        }
        .header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        .btn-back { background: none; border: none; cursor: pointer; color: var(--text-dark); display: flex; align-items: center; padding: 6px; border-radius: 50%; transition: background-color 0.2s; flex-shrink: 0; }
        .btn-back:hover { background-color: rgba(62,83,43,0.08); }

        .bot-meta-zone { display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 0; }
        .bot-text-meta { display: flex; flex-direction: column; min-width: 0; }
        .bot-header-title { font-size: 1rem; font-weight: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bot-creator-line { font-size: 0.75rem; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
        .bot-creator-line:hover { opacity: 0.9; text-decoration: underline; }

        .btn-options { background: none; border: none; cursor: pointer; color: var(--text-dark); display: flex; padding: 6px; border-radius: 50%; transition: background-color 0.2s; }
        .btn-options:hover { background-color: rgba(62,83,43,0.08); }
        .icon-svg { width: 24px; height: 24px; fill: currentColor; }

        /* ── Dropdown de opciones ────────────────────────────── */
        .dropdown-overlay { position: fixed; inset: 0; z-index: 299; display: none; }
        .dropdown-overlay.show { display: block; }

        .options-dropdown {
            position: fixed; top: 62px; right: 10px;
            background: var(--bg-main); border: 1px solid rgba(62,83,43,0.18);
            border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            z-index: 300; width: 240px; padding: 8px;
            display: none; flex-direction: column; gap: 2px;
        }
        .options-dropdown.show { display: flex; }

        .dropdown-profile-card { padding: 12px; text-align: center; border-bottom: 1px dashed rgba(62,83,43,0.15); margin-bottom: 6px; cursor: pointer; }
        .dropdown-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--bg-accent); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; margin: 0 auto 8px; background-size: cover; background-position: center; }
        .dropdown-profile-card h4 { font-weight: normal; font-size: 1rem; margin-bottom: 2px; }
        .dropdown-profile-card span { font-size: 0.78rem; opacity: 0.5; }

        .dropdown-btn { background: none; border: none; text-align: left; color: var(--text-dark); font-family: var(--font-serif); font-size: 0.9rem; padding: 10px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; width: 100%; transition: background-color 0.2s; }
        .dropdown-btn:hover { background-color: var(--bg-accent); }
        .dropdown-btn.danger { color: #8b2e2e; }
        .dropdown-btn.danger:hover { background-color: rgba(180,60,60,0.06); }
        .dropdown-btn .icon-svg { width: 18px; height: 18px; flex-shrink: 0; }
        .fav-active { color: var(--btn-color); }

        /* ── Área de chat ────────────────────────────────────── */
        .chat-scroll-area {
            position: fixed; top: 58px; left: 0; right: 0;
            bottom: 120px; overflow-y: auto;
            padding: 16px 14px 8px;
            display: flex; flex-direction: column; gap: 16px;
        }

        /* ── Banner no-key ───────────────────────────────────── */
        .no-key-banner { display: none; background: rgba(180,60,60,0.08); border: 1px solid rgba(180,60,60,0.25); border-radius: 10px; padding: 10px 14px; font-size: 0.85rem; color: #8b2e2e; margin: 8px 0; text-align: center; }
        .no-key-banner.show { display: block; }
        .no-key-banner a { color: #8b2e2e; font-weight: bold; }

        /* ── Mensajes ────────────────────────────────────────── */
        .msg-block { display: flex; gap: 12px; align-items: flex-start; position: relative; }

        .msg-avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--bg-accent); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: bold; flex-shrink: 0; background-size: cover; background-position: center; border: 1px solid rgba(62,83,43,0.1); }
        .user-avatar { background-color: rgba(62,83,43,0.08); border: 1px solid rgba(62,83,43,0.15); }

        .msg-body { display: flex; flex-direction: column; gap: 4px; max-width: 82%; }
        .msg-sender-name { font-size: 0.88rem; font-family: var(--font-serif); font-weight: bold; opacity: 0.55; display: flex; align-items: center; gap: 6px; }
        .msg-block.bot .msg-sender-name { color: var(--text-dark); opacity: 0.75; }
        .bot-badge { display: inline-block; font-size: 0.6rem; font-family: var(--font-serif); color: var(--text-dark); border: 1px solid var(--text-dark); border-radius: 3px; padding: 0px 3px; opacity: 0.55; line-height: 1.5; letter-spacing: 0.02em; vertical-align: middle; }
        .msg-text { font-size: 1.02rem; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
        .msg-text em { font-style: italic; opacity: 0.85; }
        .msg-text em.action { font-style: italic; opacity: 0.7; }

        .bot-tools { display: flex; align-items: center; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
        .stars-container { display: flex; gap: 3px; }
        .star-btn { background: none; border: none; cursor: pointer; font-size: 1.05rem; color: transparent; -webkit-text-stroke: 1px var(--text-dark); transition: color 0.15s, -webkit-text-stroke 0.15s; padding: 0 1px; opacity: 0.4; }
        .star-btn.active { color: var(--btn-color); -webkit-text-stroke: 1px var(--btn-color); opacity: 1; }

        .nav-arrows { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; opacity: 0.6; }
        .nav-arrow { background: none; border: none; cursor: pointer; color: var(--text-dark); font-size: 0.9rem; padding: 0 4px; }
        .nav-arrow:disabled { opacity: 0.25; cursor: not-allowed; }

        /* ── Indicador de escritura ──────────────────────────── */
        .typing-indicator {
            display: none; align-items: center; gap: 8px;
            position: fixed; bottom: 78px; left: 0; right: 0;
            padding: 0 20px 8px;
            background: var(--bg-main);
        }
        .typing-indicator.show { display: flex; }
        .typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-dark); opacity: 0.35; animation: typingBounce 1.4s infinite both; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce { 0%,80%,100%{ transform: scale(0.6); opacity: 0.35; } 40%{ transform: scale(1.1); opacity: 0.8; } }
        .typing-label { font-size: 0.82rem; opacity: 0.5; font-style: italic; font-family: var(--font-serif); color: var(--text-dark); margin-left: 2px; }

        /* ── Input ───────────────────────────────────────────── */
        .chat-input-area {
            position: fixed; bottom: 0; left: 0; right: 0;
            background: var(--bg-main); border-top: 1px solid var(--border-color);
            padding: 12px 16px 16px; z-index: 100;
            display: flex; justify-content: center;
            padding-bottom: calc(16px + env(safe-area-inset-bottom));
        }
        .input-wrapper { max-width: 820px; width: 100%; position: relative; display: flex; align-items: center; }
        .input-wrapper textarea {
            width: 100%; padding: 12px 48px 12px 18px;
            border: 1px solid var(--border-color); border-radius: 24px;
            font-family: var(--font-serif); font-size: 1rem;
            background-color: rgba(62,83,43,0.02); color: var(--text-dark);
            outline: none; resize: none; line-height: 1.5;
            max-height: 140px; overflow-y: auto;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-wrapper textarea::placeholder { color: var(--text-dark); opacity: 0.35; }
        .input-wrapper textarea:focus { border-color: var(--btn-color); box-shadow: 0 0 8px rgba(93,112,56,0.12); }
        .btn-send { position: absolute; right: 8px; background: none; border: none; cursor: pointer; color: var(--btn-color); padding: 7px; display: flex; border-radius: 50%; transition: transform 0.1s, color 0.2s; }
        .btn-send:hover { color: var(--btn-hover); }
        .btn-send:active { transform: scale(0.85); }
        .btn-send:disabled { opacity: 0.3; cursor: not-allowed; }
        .btn-send .icon-svg { width: 20px; height: 20px; }

        /* ── System message ──────────────────────────────────── */
        .system-msg { font-size: 0.85rem; opacity: 0.65; text-align: center; font-style: italic; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .system-msg a { color: var(--btn-color); }

        /* ── Modales (reset, report, persona, delete bar) ────── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 400; display: none; align-items: center; justify-content: center; padding: 20px; }
        .modal-overlay.show { display: flex; }
        .modal-box { background: var(--bg-main); border: 1px solid rgba(62,83,43,0.2); border-radius: 16px; padding: 24px; max-width: 380px; width: 100%; display: flex; flex-direction: column; gap: 12px; }
        .modal-box h3 { font-weight: normal; font-size: 1.1rem; }
        .modal-box p  { font-size: 0.9rem; opacity: 0.7; line-height: 1.5; }
        .modal-box textarea { width: 100%; height: 80px; padding: 10px; border: 1px solid rgba(62,83,43,0.2); border-radius: 8px; background: transparent; color: var(--text-dark); font-family: var(--font-serif); font-size: 0.9rem; resize: none; outline: none; }
        .modal-box textarea:focus { border-color: var(--btn-color); }
        .char-counter-modal { font-size: 0.78rem; opacity: 0.45; text-align: right; }
        .modal-actions { display: flex; gap: 10px; margin-top: 4px; }
        .btn-modal-cancel { flex: 1; background: none; border: 1px solid rgba(62,83,43,0.2); border-radius: 20px; padding: 10px; font-family: var(--font-serif); font-size: 0.9rem; color: var(--text-dark); cursor: pointer; }
        .btn-modal-confirm { flex: 1; background: #8b2e2e; color: #fff; border: none; border-radius: 20px; padding: 10px; font-family: var(--font-serif); font-size: 0.9rem; cursor: pointer; }
        .btn-modal-confirm.green { background: var(--btn-color); }

        /* ── Delete bar ─────────────────────────────────────── */
        .delete-bar { display: none; position: fixed; bottom: 68px; left: 0; right: 0; background: var(--bg-accent); border-top: 1px solid rgba(62,83,43,0.2); padding: 10px 14px; z-index: 200; }
        .delete-bar.show { display: block; }
        .delete-bar-inner { display: flex; align-items: center; justify-content: space-between; }
        .delete-hint { font-size: 0.85rem; opacity: 0.7; }
        .delete-actions { display: flex; gap: 10px; }
        .btn-delete-cancel  { background: none; border: 1px solid rgba(62,83,43,0.2); border-radius: 20px; padding: 7px 16px; font-family: var(--font-serif); font-size: 0.85rem; color: var(--text-dark); cursor: pointer; }
        .btn-delete-confirm { background: none; border: 1px solid rgba(180,60,60,0.35); border-radius: 20px; padding: 7px 16px; font-family: var(--font-serif); font-size: 0.85rem; color: #8b2e2e; cursor: pointer; opacity: 0.45; pointer-events: none; }
        .btn-delete-confirm.ready { opacity: 1; pointer-events: auto; }

        /* ── Selección y edición ─────────────────────────────── */
        .msg-select-check { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(201,113,113,0.5); background: var(--bg-main); display: none; align-items: center; justify-content: center; z-index: 5; pointer-events: none; position: absolute; top: 0; right: 0; }
        .msg-select-check svg { width: 11px; height: 11px; fill: white; display: none; }
        body.delete-mode .msg-block { cursor: not-allowed; }
        body.delete-mode .msg-block.deletable { cursor: pointer; }
        body.delete-mode .msg-block.deletable .msg-select-check { display: flex; }
        body.delete-mode .bot-tools { display: none !important; }
        body.delete-mode .msg-block.selected .msg-select-check { background-color: #c97171; border-color: #c97171; }
        body.delete-mode .msg-block.selected .msg-select-check svg { display: block; }
        body.delete-mode .msg-block.selected::after { content: ''; position: absolute; inset: -6px -4px; border-radius: 10px; background-color: rgba(0,0,0,0.05); border: 2px solid rgba(201,113,113,0.35); pointer-events: none; }
        body.delete-mode .msg-block.deletable:not(.selected):hover::after { content: ''; position: absolute; inset: -6px -4px; border-radius: 10px; border: 2px dashed rgba(201,113,113,0.3); pointer-events: none; }

        .msg-edit-btn { display: none; position: absolute; top: 0; right: 0; background: none; border: none; cursor: pointer; color: var(--text-dark); opacity: 0.35; padding: 2px; z-index: 5; transition: opacity 0.2s; }
        .msg-edit-btn:hover { opacity: 1; }
        .msg-edit-btn svg { width: 14px; height: 14px; fill: currentColor; }
        .msg-block.editable-last .msg-edit-btn { display: block; }
        body.delete-mode .msg-edit-btn { display: none !important; }

        .msg-edit-area { width: 100%; font-family: var(--font-serif); font-size: 1.02rem; line-height: 1.65; background: rgba(62,83,43,0.04); border: 1px solid var(--btn-color); border-radius: 8px; color: var(--text-dark); padding: 8px 10px; resize: none; outline: none; min-height: 60px; }
        .msg-edit-actions { display: flex; gap: 8px; margin-top: 6px; }
        .btn-edit-confirm { background-color: var(--btn-color); color: white; font-family: var(--font-serif); font-size: 0.85rem; padding: 5px 14px; border-radius: 7px; cursor: pointer; border: none; }
        .btn-edit-confirm:hover { background-color: var(--btn-hover); }
        .btn-edit-cancel { background: none; border: 1px solid rgba(62,83,43,0.2); color: var(--text-dark); opacity: 0.7; font-family: var(--font-serif); font-size: 0.85rem; padding: 5px 14px; border-radius: 7px; cursor: pointer; }

        /* Persona selector */
        #personaList { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
        .persona-option { text-align: left; background: none; border: 1px solid rgba(62,83,43,0.2); border-radius: 10px; padding: 10px 14px; cursor: pointer; font-family: var(--font-serif); color: var(--text-dark); width: 100%; transition: background-color 0.2s; }
        .persona-option:hover { background-color: rgba(62,83,43,0.05); }
        .persona-option.active { background: rgba(93,112,56,0.12); border-color: var(--btn-color); }
        .persona-option strong { font-size: 0.95rem; display: block; }
        .persona-option span   { font-size: 0.8rem; opacity: 0.6; display: block; margin-top: 2px; }

        /* Memory modal */
        #memoryContext, .memory-summary-edit { width:100%; min-height:70px; padding:10px; border:1px solid rgba(62,83,43,0.2); border-radius:8px; background:transparent; color:var(--text-dark); font-family:var(--font-serif); font-size:0.9rem; line-height:1.5; resize:none; outline:none; }
        #memoryContext:focus, .memory-summary-edit:focus { border-color: var(--btn-color); }
        .memory-summary-edit { min-height:120px; }
        .memory-summary-view { font-family: var(--font-serif); font-size: 0.88rem; line-height: 1.55; opacity: 0.8; max-height: 170px; overflow-y: auto; white-space: pre-wrap; padding: 2px 0; }
        .memory-summary-view:empty::before { content: 'No summary yet — it builds itself as your story grows.'; opacity: 0.5; font-style: italic; }

        /* Chats modal */
        .new-chat-btn { background: var(--btn-color); color: #fff; border: none; border-radius: 20px; padding: 10px; font-family: var(--font-serif); font-size: 0.92rem; cursor: pointer; width: 100%; }
        .new-chat-btn:hover { background: var(--btn-hover); }
        #chatsList { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; margin-top: 4px; }
        .chat-row { display: flex; align-items: stretch; border: 1px solid rgba(62,83,43,0.2); border-radius: 10px; overflow: hidden; }
        .chat-row.current { border-color: var(--btn-color); background: rgba(93,112,56,0.10); }
        .chat-row-open { flex: 1; text-align: left; background: none; border: none; padding: 10px 14px; cursor: pointer; font-family: var(--font-serif); color: var(--text-dark); }
        .chat-row-open strong { font-size: 0.9rem; display: block; }
        .chat-row-open span { font-size: 0.78rem; opacity: 0.6; display: block; margin-top: 2px; }
        .chat-row-del { background: none; border: none; border-left: 1px solid rgba(62,83,43,0.15); padding: 0 14px; cursor: pointer; color: #8b2e2e; opacity: 0.6; display: flex; align-items: center; }
        .chat-row-del svg { width: 16px; height: 16px; fill: currentColor; }
        .chat-row-del:hover { opacity: 1; }
        .chat-row-confirm { display: flex; align-items: center; gap: 8px; padding: 8px 12px; width: 100%; justify-content: space-between; }
        .chat-row-confirm span { font-size: 0.82rem; opacity: 0.8; }
        .chat-row-confirm button { font-family: var(--font-serif); font-size: 0.82rem; border-radius: 14px; padding: 5px 12px; cursor: pointer; border: 1px solid rgba(62,83,43,0.2); background: none; color: var(--text-dark); }
        .chat-row-confirm .yes { background: #8b2e2e; color: #fff; border: none; }
    </style>

    <!-- Overlay del dropdown -->
    <div class="dropdown-overlay" id="dropdownOverlay"></div>

    <!-- Header -->
    <header class="chat-header">
        <div class="header-left">
            <button class="btn-back" id="backBtn">
                <svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <div class="bot-meta-zone" id="botMetaZone">
                <div class="msg-avatar" id="botHeaderAvatar"></div>
                <div class="bot-text-meta">
                    <div class="bot-header-title" id="botNameHeader">Loading...</div>
                    <span class="bot-creator-line" id="botCreatorHeader"></span>
                </div>
            </div>
        </div>
        <div class="header-right">
            <button class="btn-options" id="optionsBtn">
                <svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
        </div>
    </header>

    <!-- Dropdown de opciones -->
    <div class="options-dropdown" id="optionsDropdown">
        <div class="dropdown-profile-card" id="dropdownProfile">
            <div class="dropdown-avatar" id="dropdownAvatar"></div>
            <h4 id="dropdownBotName">...</h4>
            <span id="dropdownBotCreator">...</span>
        </div>
        <button class="dropdown-btn" id="favBtn">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span id="favTxt">Add to Favorites</span>
        </button>
        <button class="dropdown-btn" id="editBotBtn" style="display:none;">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            Edit Character
        </button>
        <button class="dropdown-btn" id="personaBtn">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
            <span id="personaBtnTxt">Persona: <em>My Profile</em></span>
        </button>
        <button class="dropdown-btn" id="memoryBtn">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            Memory
        </button>
        <button class="dropdown-btn" id="chatsBtn">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
            Chats
        </button>
        <button class="dropdown-btn danger" id="deleteMsgBtn">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Delete Messages
        </button>
        <button class="dropdown-btn danger" id="resetChatBtn">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
            Restart Chat
        </button>
        <button class="dropdown-btn danger" id="reportBtn">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
            Report Character
        </button>
    </div>

    <!-- Modales -->
    <div class="modal-overlay" id="resetModal">
        <div class="modal-box">
            <h3>Restart Chat</h3>
            <p>This will erase the entire conversation and start over. This cannot be undone.</p>
            <div class="modal-actions">
                <button class="btn-modal-cancel" id="resetCancelBtn">Cancel</button>
                <button class="btn-modal-confirm" id="resetConfirmBtn">Restart</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="reportModal">
        <div class="modal-box">
            <h3>Report Character</h3>
            <p>Tell us briefly why you're reporting this content.</p>
            <textarea id="reportReason" placeholder="Write your report here..." maxlength="200"></textarea>
            <div class="char-counter-modal" id="reportCounter">0 / 200</div>
            <div class="modal-actions">
                <button class="btn-modal-cancel" id="reportCancelBtn">Cancel</button>
                <button class="btn-modal-confirm green" id="reportSubmitBtn">Send Report</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="personaModal">
        <div class="modal-box">
            <h3 style="font-weight:normal;margin-bottom:4px;">Choose your Persona</h3>
            <p style="font-size:0.85rem;opacity:0.7;margin-bottom:10px;">Who will you be in this story? Changes apply from your next message.</p>
            <div id="personaList"></div>
            <div class="modal-actions" style="margin-top:10px;">
                <button class="btn-modal-cancel" id="personaCancelBtn">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Memory modal -->
    <div class="modal-overlay" id="memoryModal">
        <div class="modal-box" style="max-width:440px;">
            <h3>Memory</h3>

            <div style="display:flex;flex-direction:column;gap:6px;">
                <strong style="font-size:0.9rem;font-family:var(--font-serif);">Story context</strong>
                <p style="font-size:0.82rem;opacity:0.65;line-height:1.45;margin:0;">What should this character never forget? Premise, secrets, relationships. This is always sent to the AI.</p>
                <textarea id="memoryContext" maxlength="500" placeholder="e.g. {{user}} and Aria are secret lovers; she hides that the curse is killing her."></textarea>
                <div class="char-counter-modal" id="memoryContextCounter">0 / 500</div>
            </div>

            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <strong style="font-size:0.9rem;font-family:var(--font-serif);">Memory summary</strong>
                    <button id="memorySummaryEditBtn" style="background:none;border:none;color:var(--btn-color);font-family:var(--font-serif);font-size:0.82rem;cursor:pointer;padding:0;">Edit</button>
                </div>
                <p style="font-size:0.78rem;opacity:0.55;line-height:1.45;margin:0;">The AI keeps this on its own. It uses some tokens, but it keeps your story's memory without letting the cost grow.</p>
                <div id="memorySummaryView" class="memory-summary-view"></div>
                <textarea id="memorySummaryEdit" class="memory-summary-edit" style="display:none;" placeholder="Story so far..."></textarea>
            </div>

            <div class="modal-actions">
                <button class="btn-modal-cancel" id="memoryCancelBtn">Close</button>
                <button class="btn-modal-confirm green" id="memorySaveBtn">Save</button>
            </div>
        </div>
    </div>

    <!-- Chats modal -->
    <div class="modal-overlay" id="chatsModal">
        <div class="modal-box" style="max-width:440px;">
            <h3>Chats con este personaje</h3>
            <button id="newChatBtn" class="new-chat-btn">+ Nuevo chat</button>
            <div id="chatsList"></div>
            <div class="modal-actions">
                <button class="btn-modal-cancel" id="chatsCancelBtn">Cerrar</button>
            </div>
        </div>
    </div>

    <!-- Botón de historial archivado -->
    <div id="archiveBanner" style="display:none; text-align:center; padding: 10px 14px 0;">
        <button id="loadArchiveBtn" style="background:none; border:1px solid rgba(62,83,43,0.2); border-radius:20px; padding:7px 18px; font-family:var(--font-serif); font-size:0.85rem; color:var(--text-dark); cursor:pointer; opacity:0.6; transition:opacity 0.2s;">
            ↑ ver mensajes anteriores
        </button>
    </div>

    <!-- Área de chat -->
    <div class="no-key-banner" id="noKeyBanner">
        No API key configured. <a href="#" id="noKeyLink">Set one up in Settings</a> to start chatting.
    </div>

    <main class="chat-scroll-area" id="chatScrollArea">
        <div class="empty-state" id="loadingState">Unrolling scrolls...</div>
    </main>

    <div class="typing-indicator" id="typingIndicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <span class="typing-label" id="typingName"></span>
    </div>

    <!-- Barra de borrado -->
    <div class="delete-bar" id="deleteBar">
        <div class="delete-bar-inner">
            <span class="delete-hint" id="deleteHint">Select a message to delete</span>
            <div class="delete-actions">
                <button class="btn-delete-cancel" id="deleteCancelBtn">Cancel</button>
                <button class="btn-delete-confirm" id="deleteConfirmBtn">Delete</button>
            </div>
        </div>
    </div>

    <!-- Input -->
    <footer class="chat-input-area" id="inputArea">
        <div class="input-wrapper">
            <textarea id="userInput" placeholder="Write something..." rows="1" disabled></textarea>
            <button class="btn-send" id="sendBtn" disabled>
                <svg class="icon-svg" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
        </div>
    </footer>
    `;
}

export async function init(params) {
    const characterId = params.id;
    if (!characterId) { Router.go('dashboard'); return; }

    // Ocultar bottom nav global — room tiene su propio footer
    document.getElementById('bottomNav').style.display = 'none';

    // ── Estado global del chat ────────────────────────────────
    let characterName = '', characterDescription = '', characterDefinition = '';
    let characterGreeting = '', botPhotoUrl = '', botCreatorId = null;
    let isFavorite = false, userAvatarUrl = '', userDisplayName = 'Me';
    let activePersona = null, defaultPersona = null;
    let chatHistory = [], apiSettings = null, isSending = false;
    let conversationId = null, currentBotBlockId = null, currentBotMessageId = null;
    let memorySummary = '', summaryCount = 0, storyContext = '';
    const blockStateMap = new Map();
    const SUMMARY_EVERY = 8, MAX_ALTERNATIVES = 15, RECENT_KEEP = 14;
    const CONTEXT_MAX = 500;
    const ARCHIVE_THRESHOLD = 80, ARCHIVE_BATCH = 10;

    // ── Helpers ───────────────────────────────────────────────
    const escapeHTML = (str) => str.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]));

    const formatNarrative = (text) => {
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/"([^"]+)"/g, '<em class="action">"$1"</em>');
        return text;
    };

    const activeUserName = () => activePersona ? activePersona.name : userDisplayName;
    const resolveUserTag = (text) => text.replace(/\{\{user\}\}/gi, activeUserName());

    const setAvatar = (elId, photoUrl, name) => {
        const el = document.getElementById(elId);
        if (!el) return;
        if (photoUrl) { el.style.backgroundImage = `url('${imgUrl(photoUrl)}')`; el.textContent = ''; }
        else el.textContent = name.substring(0, 2).toUpperCase();
    };

    const showSystemMsg = (html, isError = false) => {
        const container = document.getElementById('chatScrollArea');
        const div = document.createElement('div');
        div.className = 'system-msg';
        div.innerHTML = `<svg style="width:16px;height:16px;fill:currentColor;flex-shrink:0;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> ${html}`;
        container.appendChild(div);
        scrollToBottom();
    };

    const enableInput = (yes) => {
        const input = document.getElementById('userInput');
        const btn   = document.getElementById('sendBtn');
        if (yes) { input.removeAttribute('disabled'); btn.removeAttribute('disabled'); input.focus(); }
        else { input.setAttribute('disabled', ''); btn.setAttribute('disabled', ''); }
    };

    const scrollToBottom = () => {
        const area = document.getElementById('chatScrollArea');
        if (area) area.scrollTop = area.scrollHeight;
    };

    const toggleDropdown = () => {
        const dd  = document.getElementById('optionsDropdown');
        const ov  = document.getElementById('dropdownOverlay');
        const open = dd.classList.contains('show');
        dd.classList.toggle('show', !open);
        ov.classList.toggle('show', !open);
    };

    // ── Cargar personaje ──────────────────────────────────────
    const loadCharacter = async () => {
        try {
            const { data: char, error } = await _supabase.from('characters').select('*').eq('id', characterId).single();
            if (error || !char) { showSystemMsg('Character not found.', false); return; }

            characterName        = char.name;
            characterDescription = char.description || '';
            characterDefinition  = char.definition  || '';
            characterGreeting    = char.first_message || `*${char.name} looks at you in silence.*`;
            botPhotoUrl          = char.photo_url || '';
            botCreatorId         = char.creator_id;

            document.getElementById('botNameHeader').textContent = char.name;
            document.getElementById('dropdownBotName').textContent = char.name;
            document.getElementById('typingName').textContent = char.name + ' is writing...';
            setAvatar('botHeaderAvatar', botPhotoUrl, char.name);
            setAvatar('dropdownAvatar',  botPhotoUrl, char.name);
            setAvatar('typingAvatar',    botPhotoUrl, char.name);

            if (char.creator_id) {
                const { data: profile } = await _supabase.from('profiles').select('username').eq('id', char.creator_id).single();
                const uname = profile?.username || 'creator';
                document.getElementById('botCreatorHeader').textContent  = `By @${uname}`;
                document.getElementById('dropdownBotCreator').textContent = `By @${uname}`;
            }

            if (char.creator_id === Auth.userId) document.getElementById('editBotBtn').style.display = 'flex';
        } catch (e) { console.error(e); }
    };

    // ── Cargar perfil de usuario ──────────────────────────────
    const loadUserProfile = async () => {
        if (!Auth.userId) return;
        try {
            const { data: profile } = await _supabase.from('profiles').select('display_name, avatar_url').eq('id', Auth.userId).single();
            if (profile) { userAvatarUrl = profile.avatar_url || ''; userDisplayName = profile.display_name || 'Me'; }
        } catch {}
        try {
            const { data: persona } = await _supabase.from('user_personas').select('id, name, description').eq('user_id', Auth.userId).eq('is_default', true).single();
            if (persona) { activePersona = persona; defaultPersona = persona; document.getElementById('personaBtnTxt').innerHTML = `Persona: <em>${persona.name}</em>`; }
        } catch {}
    };

    // ── Cargar ajustes de API ─────────────────────────────────
    const loadApiSettings = async () => {
        if (!Auth.userId) return;
        try {
            const { data, error } = await _supabase.from('user_settings').select('*').eq('user_id', Auth.userId).single();
            if (error || !data || !data.api_key) { document.getElementById('noKeyBanner').classList.add('show'); return; }
            apiSettings = data;
        } catch { document.getElementById('noKeyBanner').classList.add('show'); }
    };

    // ── Append mensajes ───────────────────────────────────────
    const appendUserMessage = (text, msgId) => {
        const container   = document.getElementById('chatScrollArea');
        const displayName = activeUserName();
        const avatarStyle = userAvatarUrl ? `style="background-image:url('${userAvatarUrl}')"` : '';
        const avatarText  = userAvatarUrl ? '' : displayName.substring(0, 2).toUpperCase();
        const idAttr      = msgId ? `data-msgid="${msgId}"` : '';
        const div = document.createElement('div');
        div.className = 'msg-block user';
        if (msgId) div.dataset.msgid = msgId;
        div.innerHTML = `
            <div class="msg-select-check"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
            <button class="msg-edit-btn" title="Edit message"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
            <div class="msg-avatar user-avatar" ${avatarStyle}>${avatarText}</div>
            <div class="msg-body">
                <span class="msg-sender-name">${displayName}</span>
                <p class="msg-text">${formatNarrative(escapeHTML(text))}</p>
            </div>`;
        div.onclick = () => toggleSelectMessage(div);
        div.querySelector('.msg-edit-btn').onclick = (e) => { e.stopPropagation(); startEdit(div, 'user'); };
        container.appendChild(div);
        scrollToBottom();
        updateEditableMarkers();
    };

    const appendBotMessage = (text, blockId, isLoaded = false) => {
        const container   = document.getElementById('chatScrollArea');
        const avatarStyle = botPhotoUrl ? `style="background-image:url('${imgUrl(botPhotoUrl)}')"` : '';
        const avatarText  = botPhotoUrl ? '' : characterName.substring(0, 2).toUpperCase();
        const div = document.createElement('div');
        div.className = 'msg-block bot';
        div.id = blockId;
        div.innerHTML = `
            <div class="msg-select-check"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
            <button class="msg-edit-btn" title="Edit message"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
            <div class="msg-avatar" ${avatarStyle}>${avatarText}</div>
            <div class="msg-body">
                <span class="msg-sender-name">${characterName} <span class="bot-badge">f.ai</span></span>
                <p class="msg-text" id="txt_${blockId}"></p>
                <div class="bot-tools" id="tools_${blockId}">
                    <div class="stars-container">
                        ${[1,2,3].map(n => `<button class="star-btn" data-n="${n}">★</button>`).join('')}
                    </div>
                    <div class="nav-arrows">
                        <button class="nav-arrow" id="left_${blockId}" disabled>&lt;</button>
                        <span id="nav_label_${blockId}">1/${MAX_ALTERNATIVES}</span>
                        <button class="nav-arrow" id="right_${blockId}">&gt;</button>
                    </div>
                </div>
            </div>`;

        div.querySelector('.msg-edit-btn').onclick = (e) => { e.stopPropagation(); startEdit(div, 'bot'); };
        div.querySelectorAll('.star-btn').forEach(btn => { btn.onclick = (e) => { e.stopPropagation(); rateBotMessage(blockId, parseInt(btn.dataset.n)); }; });
        div.onclick = () => toggleSelectMessage(div);
        div.getElementById = (id) => div.querySelector(`#${id}`); // no existe en div, usamos document

        // Nav arrows
        setTimeout(() => {
            const lBtn = document.getElementById(`left_${blockId}`);
            const rBtn = document.getElementById(`right_${blockId}`);
            if (lBtn) lBtn.onclick = (e) => { e.stopPropagation(); navigateAlt(blockId, -1); };
            if (rBtn) rBtn.onclick = (e) => { e.stopPropagation(); navigateAlt(blockId, 1); };
        }, 0);

        container.appendChild(div);
        currentBotBlockId = blockId;

        if (isLoaded) {
            document.getElementById(`txt_${blockId}`).innerHTML = formatNarrative(resolveUserTag(text));
            updateNavArrows(blockId);
        } else {
            typeWriter(blockId, text);
        }
        scrollToBottom();
        updateEditableMarkers();
    };

    const typeWriter = (blockId, text) => new Promise(resolve => {
        const el = document.getElementById(`txt_${blockId}`);
        if (!el) { resolve(); return; }
        text = resolveUserTag(text);
        let i = 0;
        const lBtn = document.getElementById(`left_${blockId}`);
        const rBtn = document.getElementById(`right_${blockId}`);
        if (lBtn) lBtn.disabled = true;
        if (rBtn) rBtn.disabled = true;
        const step = () => {
            if (i < text.length) { i++; el.innerHTML = formatNarrative(text.substring(0, i)); scrollToBottom(); setTimeout(step, 11); }
            else { updateNavArrows(blockId); resolve(); }
        };
        step();
    });

    // ── Greeting para invitados ───────────────────────────────
    const showGuestGreeting = () => {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('chatScrollArea').innerHTML = '';
        const gid = 'guest_' + Date.now();
        blockStateMap.set(gid, { alternatives: [{ text: characterGreeting, rating: 0 }], index: 0, userPrompt: '', historySnapshot: [], generating: false });
        appendBotMessage(characterGreeting, gid, true);
        const inp = document.getElementById('userInput');
        const btn = document.getElementById('sendBtn');
        inp.removeAttribute('disabled'); inp.placeholder = 'Write something... (sign in to chat)';
        btn.removeAttribute('disabled');
    };

    // ── Cargar historial ──────────────────────────────────────
    const loadHistory = async (targetConvId = null) => {
        const container = document.getElementById('chatScrollArea');
        // OJO: #loadingState vive DENTRO de #chatScrollArea, así que el primer
        // container.innerHTML = '' lo borra para siempre. En la 2da llamada (al
        // crear o cambiar de chat) getElementById devolvía null y .style reventaba
        // con un TypeError ANTES del try → el cambio de chat se abortaba en silencio.
        // Por eso "había que refrescar" y no se podía saltar a otro chat.
        const loadingEl = document.getElementById('loadingState');
        if (loadingEl) loadingEl.style.display = 'none';
        const archiveEl = document.getElementById('archiveBanner');
        if (archiveEl) archiveEl.style.display = 'none';
        if (container) container.innerHTML = '';
        chatHistory = []; blockStateMap.clear();
        currentBotBlockId = currentBotMessageId = null;
        const COLS = 'id, memory_summary, summary_count, story_context, persona_id';
        try {
            let conv = null;
            if (targetConvId) {
                const { data } = await _supabase.from('conversations').select(COLS).eq('id', targetConvId).single();
                conv = data;
            }
            if (!conv) {
                const { data } = await _supabase.from('conversations').select(COLS).eq('user_id', Auth.userId).eq('character_id', characterId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
                conv = data;
            }
            if (!conv) {
                const { data: newConv, error: createErr } = await _supabase.from('conversations').insert({ user_id: Auth.userId, character_id: characterId }).select(COLS).single();
                if (createErr) throw createErr;
                conv = newConv;
            }
            conversationId = conv.id;
            memorySummary  = conv.memory_summary || '';
            summaryCount   = conv.summary_count  || 0;
            storyContext   = conv.story_context  || '';

            // Persona: por defecto la del perfil; si este chat tiene una guardada, manda esa.
            activePersona = defaultPersona;
            document.getElementById('personaBtnTxt').innerHTML = `Persona: <em>${defaultPersona ? defaultPersona.name : 'My Profile'}</em>`;
            if (conv.persona_id) {
                try {
                    const { data: convPersona } = await _supabase.from('user_personas').select('id, name, description').eq('id', conv.persona_id).single();
                    if (convPersona) { activePersona = convPersona; document.getElementById('personaBtnTxt').innerHTML = `Persona: <em>${convPersona.name}</em>`; }
                } catch {}
            }

            // Cargar solo los últimos 80 mensajes
            const { data: messages, error: msgErr } = await _supabase
                .from('messages')
                .select('id, sender_type, sender_name, content, rating, alternatives, alt_index')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(ARCHIVE_THRESHOLD);

            // Verificar si hay mensajes archivados para mostrar el botón
            const { count: archiveCount } = await _supabase
                .from('messages_archive')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conversationId);
            if (archiveCount > 0) document.getElementById('archiveBanner').style.display = 'block';

            if (msgErr || !messages || messages.length === 0) {
                const gid = 'init_' + Date.now();
                blockStateMap.set(gid, { alternatives: [{ text: characterGreeting, rating: 0 }], index: 0, userPrompt: '', historySnapshot: [], generating: false });
                appendBotMessage(characterGreeting, gid, true);
                chatHistory.push({ role: 'assistant', content: characterGreeting });
                const { data: savedGreet } = await _supabase.from('messages').insert({ conversation_id: conversationId, sender_type: 'bot', sender_name: characterName, content: characterGreeting }).select('id').single();
                if (savedGreet?.id) { const gb = document.getElementById(gid); if (gb) gb.dataset.msgid = savedGreet.id; }
            } else {
                // Invertir para mostrar del más viejo al más nuevo
                const ordered = [...messages].reverse();
                let lastUserText = '', historyAtPoint = [];
                ordered.forEach(msg => {
                    const isBot = msg.sender_type === 'bot';
                    if (isBot) {
                        let alts = [{ text: msg.content, rating: msg.rating || 0 }], idx = 0;
                        try { if (msg.alternatives) { alts = typeof msg.alternatives === 'string' ? JSON.parse(msg.alternatives) : msg.alternatives; idx = Math.min(msg.alt_index || 0, alts.length - 1); } } catch {}
                        blockStateMap.set(msg.id, { alternatives: alts, index: idx, userPrompt: lastUserText, historySnapshot: historyAtPoint.slice(), generating: false });
                        appendBotMessage(alts[idx].text, msg.id, true);
                    } else {
                        lastUserText = msg.content;
                        appendUserMessage(msg.content, msg.id);
                    }
                    chatHistory.push({ role: isBot ? 'assistant' : 'user', content: msg.content });
                    historyAtPoint.push({ role: isBot ? 'assistant' : 'user', content: msg.content });
                });
                const allIds = [...blockStateMap.keys()];
                allIds.slice(0, -1).forEach(bid => { const t = document.getElementById(`tools_${bid}`); if (t) t.style.display = 'none'; });
            }
        } catch (e) {
            console.error('loadHistory error:', e);
            appendBotMessage(characterGreeting, 'init_' + Date.now(), true);
        }
        enableInput(true); scrollToBottom();
    };

    // ── Cargar historial archivado ────────────────────────────
    const loadArchivedMessages = async () => {
        const btn = document.getElementById('loadArchiveBtn');
        btn.textContent = 'Cargando...'; btn.disabled = true;
        try {
            const { data: archived } = await _supabase
                .from('messages_archive')
                .select('id, sender_type, sender_name, content, created_at')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (!archived || archived.length === 0) {
                document.getElementById('archiveBanner').style.display = 'none'; return;
            }

            const container = document.getElementById('chatScrollArea');
            const fragment  = document.createDocumentFragment();
            archived.forEach(msg => {
                const isBot = msg.sender_type === 'bot';
                const div   = document.createElement('div');
                div.className = `msg-block ${isBot ? 'bot' : 'user'} archived-msg`;
                div.style.opacity = '0.65';
                const avatarStyle = isBot && botPhotoUrl ? `style="background-image:url('${imgUrl(botPhotoUrl)}')"` : '';
                const avatarText  = isBot ? (botPhotoUrl ? '' : characterName.substring(0, 2).toUpperCase()) : (userAvatarUrl ? '' : userDisplayName.substring(0, 2).toUpperCase());
                div.innerHTML = `
                    <div class="msg-avatar ${isBot ? '' : 'user-avatar'}" ${avatarStyle}>${avatarText}</div>
                    <div class="msg-body">
                        <span class="msg-sender-name">${isBot ? characterName : userDisplayName}</span>
                        <p class="msg-text">${formatNarrative(escapeHTML(msg.content))}</p>
                    </div>`;
                fragment.appendChild(div);
            });

            const firstChild = container.firstChild;
            container.insertBefore(fragment, firstChild);
            document.getElementById('archiveBanner').style.display = 'none';
        } catch (e) {
            console.error('Archive load error:', e);
            btn.textContent = '↑ ver mensajes anteriores'; btn.disabled = false;
        }
    };

    // ── Favoritos ─────────────────────────────────────────────
    const checkFavorite = async () => {
        try {
            const { data } = await _supabase.from('favorites').select('id').eq('character_id', characterId).eq('user_id', Auth.userId).single();
            if (data) { isFavorite = true; document.getElementById('favBtn').classList.add('fav-active'); document.getElementById('favTxt').textContent = 'Saved in Favorites'; }
        } catch {}
    };

    // ── callAI ────────────────────────────────────────────────
    const callAI = async (userText, historyOverride) => {
        const memBlock = memorySummary ? `\nSTORY SO FAR:\n"${memorySummary}"\n` : '';
        const ctxBlock = storyContext ? `\nKEY CONTEXT (always true — never contradict this):\n"${storyContext}"\n` : '';
        const userName = activePersona ? activePersona.name : userDisplayName;
        // Reemplazar los marcadores {{char}} / {{user}} por los nombres reales
        const fillVars = (s) => (s || '').replace(/\{\{char\}\}/gi, characterName).replace(/\{\{user\}\}/gi, userName);
        const charInfo = fillVars(characterDefinition || characterDescription);
        const systemPrompt = `[LITERARY ROLEPLAY] You are ${characterName}, and only ${characterName}. Stay fully in character at all times.

CHARACTER — honor every detail below without deviation:
${charInfo}

TONE & STYLE — match the vocabulary, rhythm and register of this opening:
"${fillVars(characterGreeting)}"
${memBlock}${ctxBlock}
USER — the person you are talking to goes by ${userName}.${activePersona?.description ? ` About them: ${fillVars(activePersona.description)}.` : ''}

PROSE RULES:
- SHOW, DON'T TELL: reveal feelings through small actions, body language and subtext — never state them flatly.
- AUTHENTIC VOICE: keep ${characterName}'s exact personality and way of speaking.
- FORMAT: spoken dialogue in plain text; actions and inner thoughts wrapped in *asterisks*.
- LENGTH: keep replies under 150 words; make every word earn its place.
- Always write clear, coherent, grammatical prose. Never output random words, stray symbols or broken text.
- OUTPUT ONLY ${characterName}'s response — no disclaimers, no narrating these rules, no out-of-character commentary.`;

        const recentHistory = (historyOverride !== undefined ? historyOverride : chatHistory).slice(-RECENT_KEEP);
        const messages = [{ role: 'system', content: systemPrompt }, ...recentHistory];

        try {
            if (apiSettings.provider === 'anthropic') {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': apiSettings.api_key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                    body: JSON.stringify({ model: apiSettings.model || 'claude-haiku-4-5', max_tokens: 400, system: systemPrompt, messages: messages.filter(m => m.role !== 'system') })
                });
                if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || 'HTTP ' + res.status); }
                const d = await res.json();
                return d.content?.[0]?.text?.trim() || null;
            }
            if (apiSettings.provider === 'gemini') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiSettings.api_key}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: apiSettings.model || 'gemini-2.0-flash', max_tokens: 400, messages })
                });
                if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || 'HTTP ' + res.status); }
                const d = await res.json();
                return d.choices?.[0]?.message?.content?.trim() || null;
            }
            let endpoint = '', model = '';
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiSettings.api_key}` };
            if (apiSettings.provider === 'openai')      { endpoint = 'https://api.openai.com/v1/chat/completions'; model = 'gpt-4o-mini'; }
            else if (apiSettings.provider === 'openrouter') { endpoint = 'https://openrouter.ai/api/v1/chat/completions'; model = apiSettings.model || 'gryphe/mythomax-l2-13b'; headers['HTTP-Referer'] = window.location.origin; headers['X-Title'] = 'Froggie AI'; }
            else if (apiSettings.provider === 'groq')   { endpoint = 'https://api.groq.com/openai/v1/chat/completions'; model = apiSettings.model || 'llama-3.1-8b-instant'; }
            else if (apiSettings.provider === 'other')  { endpoint = apiSettings.custom_url; model = apiSettings.model || ''; }
            const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 400 }) });
            if (!response.ok) { const e = await response.json().catch(()=>({})); throw new Error(e?.error?.message || `HTTP ${response.status}`); }
            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || null;
        } catch (err) {
            console.error('API error:', err);
            showSystemMsg(
                err.message.includes('401') || err.message.includes('key') ? `Your API key was rejected. <a href="#" id="fixKeyLink">Check your settings.</a>` :
                err.message.includes('429') ? 'Too many requests. Wait a moment and try again.' :
                `Connection error: ${err.message}`, true
            );
            setTimeout(() => { const l = document.getElementById('fixKeyLink'); if (l) l.onclick = (e) => { e.preventDefault(); Router.go('api-settings'); }; }, 100);
            return null;
        }
    };

    const callAIRaw = async (prompt) => {
        if (!apiSettings) return null;
        const messages = [{ role: 'user', content: prompt }];
        try {
            if (apiSettings.provider === 'anthropic') {
                const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiSettings.api_key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: apiSettings.model || 'claude-haiku-4-5', max_tokens: 350, messages }) });
                const d = await res.json(); return d.content?.[0]?.text || null;
            }
            if (apiSettings.provider === 'gemini') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiSettings.api_key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: apiSettings.model || 'gemini-2.0-flash', max_tokens: 350, messages }) });
                const d = await res.json(); return d.choices?.[0]?.message?.content || null;
            }
            let endpoint = '', model = '';
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiSettings.api_key}` };
            if (apiSettings.provider === 'openai') { endpoint = 'https://api.openai.com/v1/chat/completions'; model = 'gpt-4o-mini'; }
            else if (apiSettings.provider === 'openrouter') { endpoint = 'https://openrouter.ai/api/v1/chat/completions'; model = apiSettings.model || 'gryphe/mythomax-l2-13b'; headers['HTTP-Referer'] = window.location.origin; headers['X-Title'] = 'Froggie AI'; }
            else if (apiSettings.provider === 'groq')  { endpoint = 'https://api.groq.com/openai/v1/chat/completions'; model = apiSettings.model || 'llama-3.1-8b-instant'; }
            else if (apiSettings.provider === 'other') { endpoint = apiSettings.custom_url; model = apiSettings.model || ''; }
            const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ model, messages, max_tokens: 350 }) });
            const d = await res.json(); return d.choices?.[0]?.message?.content || null;
        } catch { return null; }
    };

    // ── Enviar mensaje ────────────────────────────────────────
    // Enviar vacío = el bot continúa la historia solo (como Chai/CAI).
    const continueStory = async () => {
        if (!Auth.userId) { UI.showLoginPopup('Join Froggie AI to start chatting!'); return; }
        if (isSending) return;
        if (!apiSettings) { document.getElementById('noKeyBanner').classList.add('show'); return; }

        isSending = true; enableInput(false);
        blockStateMap.forEach((_, bid) => { const t = document.getElementById(`tools_${bid}`); if (t) t.style.display = 'none'; });

        // Turno sintético para que todo proveedor (incl. Gemini) reciba un turno de usuario al final.
        const contHistory = [...chatHistory, { role: 'user', content: '(Continue the story from where it left off, in character. Do not repeat previous text.)' }];

        document.getElementById('typingIndicator').classList.add('show'); scrollToBottom();
        const botReply = await callAI('(continue)', contHistory);
        document.getElementById('typingIndicator').classList.remove('show');

        if (botReply) {
            const blockId = 'msg_' + Math.random().toString(36).substring(2, 9);
            blockStateMap.set(blockId, { alternatives: [{ text: botReply, rating: 0 }], index: 0, userPrompt: '(continue)', historySnapshot: contHistory.slice(), generating: false });
            currentBotBlockId = blockId;
            appendBotMessage(botReply, blockId, false);
            chatHistory.push({ role: 'assistant', content: botReply });

            const { data: savedBotMsg } = await _supabase.from('messages').insert({ conversation_id: conversationId, sender_type: 'bot', sender_name: characterName, content: botReply }).select('id').single();
            currentBotMessageId = savedBotMsg?.id || null;
            if (currentBotMessageId) { const bb = document.getElementById(blockId); if (bb) bb.dataset.msgid = currentBotMessageId; }
            await _supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

            if (chatHistory.length > RECENT_KEEP + SUMMARY_EVERY) await generateAndSaveSummary();
        }
        isSending = false; enableInput(true);
    };

    const sendMessage = async () => {
        if (!Auth.userId) { UI.showLoginPopup('Join Froggie AI to start chatting!'); return; }
        if (isSending) return;
        const input = document.getElementById('userInput');
        const text  = input.value.trim();
        if (!text) { return continueStory(); }
        if (!apiSettings) { document.getElementById('noKeyBanner').classList.add('show'); return; }

        isSending = true; enableInput(false);
        input.value = ''; input.style.height = 'auto';

        blockStateMap.forEach((_, bid) => { const t = document.getElementById(`tools_${bid}`); if (t) t.style.display = 'none'; });

        appendUserMessage(text);

        const { data: savedUserMsg } = await _supabase.from('messages').insert({ conversation_id: conversationId, sender_type: 'user', sender_name: 'You', content: text }).select('id').single();
        const userBlocks = document.querySelectorAll('.msg-block.user');
        if (userBlocks.length > 0 && savedUserMsg?.id) userBlocks[userBlocks.length - 1].dataset.msgid = savedUserMsg.id;

        if (chatHistory.filter(m => m.role === 'user').length === 0) await _supabase.rpc('increment_chat_count', { char_id: characterId });
        chatHistory.push({ role: 'user', content: text });

        document.getElementById('typingIndicator').classList.add('show'); scrollToBottom();
        const botReply = await callAI(text);
        document.getElementById('typingIndicator').classList.remove('show');

        if (botReply) {
            const blockId = 'msg_' + Math.random().toString(36).substring(2, 9);
            blockStateMap.set(blockId, { alternatives: [{ text: botReply, rating: 0 }], index: 0, userPrompt: text, historySnapshot: chatHistory.slice(), generating: false });
            currentBotBlockId = blockId;
            appendBotMessage(botReply, blockId, false);
            chatHistory.push({ role: 'assistant', content: botReply });

            const { data: savedBotMsg } = await _supabase.from('messages').insert({ conversation_id: conversationId, sender_type: 'bot', sender_name: characterName, content: botReply }).select('id').single();
            currentBotMessageId = savedBotMsg?.id || null;
            // Guardar el ID real de Supabase en el dataset del bloque DOM para poder borrarlo después
            if (currentBotMessageId) {
                const botBlock = document.getElementById(blockId);
                if (botBlock) botBlock.dataset.msgid = currentBotMessageId;
            }
            await _supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

            // ── Actualizar estadísticas de conversación ───────
            try {
                const today = new Date().toISOString().split('T')[0];
                await _supabase.rpc('increment_conversation_stats', {
                    p_conversation_id: conversationId,
                    p_user_id:         Auth.userId,
                    p_character_id:    characterId,
                    p_date:            today
                });
            } catch {}

            if (chatHistory.length > RECENT_KEEP + SUMMARY_EVERY) await generateAndSaveSummary();
        }
        isSending = false; enableInput(true);
    };

    // ── Alternativas ──────────────────────────────────────────
    const navigateAlt = async (blockId, direction) => {
        const state = blockStateMap.get(blockId);
        if (!state || state.generating) return;
        const target = state.index + direction;

        if (direction === 1 && target >= state.alternatives.length) {
            if (state.alternatives.length >= MAX_ALTERNATIVES) { updateNavArrows(blockId); return; }
            state.generating = true;
            const textEl = document.getElementById(`txt_${blockId}`);
            const lBtn   = document.getElementById(`left_${blockId}`);
            const rBtn   = document.getElementById(`right_${blockId}`);
            if (textEl) textEl.style.visibility = 'hidden';
            if (lBtn) lBtn.disabled = true; if (rBtn) rBtn.disabled = true;
            document.getElementById('typingIndicator').classList.add('show');

            const alt = await callAI(state.userPrompt || '', state.historySnapshot || chatHistory.slice(0, -1));
            document.getElementById('typingIndicator').classList.remove('show');
            if (textEl) textEl.style.visibility = 'visible';
            state.generating = false;

            if (alt) {
                state.alternatives.push({ text: alt, rating: 0 });
                state.index = state.alternatives.length - 1;
                // Si el blockId es UUID real de Supabase úsalo directo.
                // Si es temporal (msg_/init_/guest_), buscar el UUID real en dataset.msgid del bloque DOM.
                const realMsgId = (blockId.startsWith('msg_') || blockId.startsWith('init_') || blockId.startsWith('guest_'))
                    ? (document.getElementById(blockId)?.dataset.msgid || null)
                    : blockId;
                try { if (realMsgId) await _supabase.from('messages').update({ content: alt, rating: 0, alternatives: JSON.stringify(state.alternatives), alt_index: state.index }).eq('id', realMsgId); } catch {}
                const textElNew = document.getElementById(`txt_${blockId}`);
                if (textElNew) { textElNew.style.visibility = 'visible'; textElNew.innerHTML = ''; }
                updateStars(blockId, 0);
                await typeWriter(blockId, alt);
                scrollToBottom();
            } else { updateNavArrows(blockId); }
            return;
        }

        state.index = Math.max(0, Math.min(target, state.alternatives.length - 1));
        const { text, rating } = state.alternatives[state.index];
        const textEl = document.getElementById(`txt_${blockId}`);
        if (textEl) { textEl.style.visibility = 'visible'; textEl.innerHTML = formatNarrative(resolveUserTag(text)); }
        updateStars(blockId, rating);
        updateNavArrows(blockId);
        scrollToBottom();
    };

    const updateNavArrows = (blockId) => {
        const state = blockStateMap.get(blockId);
        const lBtn  = document.getElementById(`left_${blockId}`);
        const rBtn  = document.getElementById(`right_${blockId}`);
        const label = document.getElementById(`nav_label_${blockId}`);
        if (!lBtn || !rBtn || !label || !state) return;
        lBtn.disabled = state.index === 0;
        rBtn.disabled = state.alternatives.length >= MAX_ALTERNATIVES && state.index === state.alternatives.length - 1;
        label.textContent = `${state.index + 1}/${MAX_ALTERNATIVES}`;
    };

    // ── Rating ────────────────────────────────────────────────
    const rateBotMessage = async (blockId, rating) => {
        const state = blockStateMap.get(blockId);
        if (!state || state.alternatives.length === 0) return;
        state.alternatives[state.index].rating = rating;
        updateStars(blockId, rating);
        const realMsgId = (blockId.startsWith('msg_') || blockId.startsWith('init_') || blockId.startsWith('guest_'))
            ? (document.getElementById(blockId)?.dataset.msgid || null)
            : blockId;
        if (realMsgId) await _supabase.from('messages').update({ rating }).eq('id', realMsgId);
        if (rating === 3 && state.userPrompt) {
            await _supabase.from('training_pairs').insert({ character_id: characterId, user_message: state.userPrompt, bot_message: state.alternatives[state.index].text, rating: 3 });
        }
    };

    const updateStars = (blockId, rating) => {
        const tools = document.getElementById(`tools_${blockId}`);
        if (!tools) return;
        tools.querySelectorAll('.star-btn').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.n) <= rating));
    };

    // ── Resumen de memoria ────────────────────────────────────
    const generateAndSaveSummary = async () => {
        if (!apiSettings) return;
        const toSummarize = chatHistory.slice(0, SUMMARY_EVERY);
        if (toSummarize.length < SUMMARY_EVERY) return;
        const convoBlock    = toSummarize.map(m => `${m.role === 'user' ? 'User' : characterName}: ${m.content}`).join('\n');
        const prevNote      = memorySummary ? `Previous summary:\n"${memorySummary}"\n\n` : '';
        const summaryPrompt = `${prevNote}New exchanges:\n${convoBlock}\n\nSummarize the story so far in max 300 words, third person, present tense. You MUST preserve: emotional state of each character, secrets or revelations, tension and conflicts, the exact dynamic between characters, any significant shift in their relationship, and unresolved threads or pending promises. Remove filler but keep subtext intact. Output only the summary text.`;
        try {
            const result = await callAIRaw(summaryPrompt);
            if (!result) return;
            let finalSummary = result.trim(), finalCount = summaryCount + 1;
            const { error: updateErr } = await _supabase.from('conversations').update({ memory_summary: finalSummary, summary_count: finalCount }).eq('id', conversationId);
            if (updateErr) return;
            memorySummary = finalSummary; summaryCount = finalCount;
            chatHistory   = chatHistory.slice(SUMMARY_EVERY);

            // ── Archivar y borrar mensajes viejos ─────────────
            try {
                const { data: totalMsgs } = await _supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: false })
                    .eq('conversation_id', conversationId);

                if (totalMsgs && totalMsgs.length >= ARCHIVE_THRESHOLD) {
                    // Tomar los más viejos
                    const { data: oldMsgs } = await _supabase
                        .from('messages')
                        .select('id, sender_type, sender_name, content, created_at')
                        .eq('conversation_id', conversationId)
                        .order('created_at', { ascending: true })
                        .limit(ARCHIVE_BATCH);

                    if (oldMsgs && oldMsgs.length > 0) {
                        // Copiar a messages_archive sin alternatives
                        await _supabase.from('messages_archive').insert(
                            oldMsgs.map(m => ({
                                conversation_id: conversationId,
                                sender_type:     m.sender_type,
                                sender_name:     m.sender_name,
                                content:         m.content,
                                created_at:      m.created_at
                            }))
                        );
                        // Borrar de messages
                        const idsToDelete = oldMsgs.map(m => m.id);
                        await _supabase.from('messages').delete().in('id', idsToDelete);

                        // Mostrar botón de historial si aún no está visible
                        document.getElementById('archiveBanner').style.display = 'block';
                    }
                }
            } catch (archiveErr) { console.warn('Archive error:', archiveErr); }

        } catch (e) { console.warn('Summary failed:', e); }
    };

    // ── Selección y borrado ───────────────────────────────────
    let deleteSelected = new Set();

    const updateDeleteConfirmBtn = () => {
        const btn  = document.getElementById('deleteConfirmBtn');
        const hint = document.getElementById('deleteHint');
        const n = deleteSelected.size;
        if (n > 0) { btn.classList.add('ready'); hint.textContent = n === 1 ? '1 message will be removed' : `${n} messages will be removed`; }
        else { btn.classList.remove('ready'); hint.textContent = 'Select a message to delete'; }
    };

    const updateEditableMarkers = () => {
        document.querySelectorAll('.msg-block.editable-last').forEach(el => el.classList.remove('editable-last'));
        const userBlocks = document.querySelectorAll('.msg-block.user:not(.archived-msg)');
        if (userBlocks.length > 0) userBlocks[userBlocks.length - 1].classList.add('editable-last');
        const botBlocks = document.querySelectorAll('.msg-block.bot:not(.archived-msg)');
        if (botBlocks.length > 0) botBlocks[botBlocks.length - 1].classList.add('editable-last');
    };

    // Los dos últimos mensajes visibles (no archivados) son los accionables.
    const lastTwoBlocks = () => {
        const all = [...document.querySelectorAll('.msg-block')].filter(b => !b.classList.contains('archived-msg'));
        return all.slice(-2);
    };

    const enterDeleteMode = () => {
        toggleDropdown();
        const targets = lastTwoBlocks();
        if (targets.length === 0) return;
        document.body.classList.add('delete-mode');
        document.getElementById('inputArea').style.display = 'none';
        document.getElementById('deleteBar').classList.add('show');
        deleteSelected = new Set();
        targets.forEach(b => b.classList.add('deletable'));
        updateDeleteConfirmBtn();
    };

    const exitDeleteMode = () => {
        document.body.classList.remove('delete-mode');
        document.getElementById('inputArea').style.display = '';
        document.getElementById('deleteBar').classList.remove('show');
        document.querySelectorAll('.msg-block.selected, .msg-block.deletable').forEach(el => el.classList.remove('selected', 'deletable'));
        deleteSelected = new Set();
    };

    // Selección individual: marca exactamente el mensaje tocado, sin arrastrar al de al lado.
    const toggleSelectMessage = (block) => {
        if (!document.body.classList.contains('delete-mode') || !block.classList.contains('deletable')) return;
        if (block.classList.contains('selected')) { block.classList.remove('selected'); deleteSelected.delete(block); }
        else { block.classList.add('selected'); deleteSelected.add(block); }
        updateDeleteConfirmBtn();
    };

    const rebuildChatHistory = () => {
        chatHistory = [];
        document.querySelectorAll('.msg-block').forEach(block => {
            if (block.classList.contains('archived-msg')) return;
            const txt = block.querySelector('.msg-text');
            if (!txt) return;
            if (block.classList.contains('user')) chatHistory.push({ role: 'user', content: txt.innerText });
            else if (block.classList.contains('bot')) chatHistory.push({ role: 'assistant', content: txt.innerText });
        });
    };

    // ID real de un bloque: dataset.msgid (nuevos) o block.id si es un UUID real (cargados).
    const resolveMsgId = (block) => {
        if (block.dataset && block.dataset.msgid) return block.dataset.msgid;
        const id = block.id;
        if (id && !id.startsWith('msg_') && !id.startsWith('init_') && !id.startsWith('guest_')) return id;
        return null;
    };

    // Mostrar las herramientas (estrellas/flechas) solo en el último bot, y refrescarlas.
    const updateBotToolsVisibility = () => {
        const botBlocks = [...document.querySelectorAll('.msg-block.bot:not(.archived-msg)')];
        botBlocks.forEach((b, i) => {
            const tools = b.querySelector('.bot-tools');
            if (tools) tools.style.display = (i === botBlocks.length - 1) ? '' : 'none';
        });
        const last = botBlocks[botBlocks.length - 1];
        if (last && last.id) {
            const st = blockStateMap.get(last.id);
            if (st) { updateStars(last.id, st.alternatives[st.index]?.rating || 0); updateNavArrows(last.id); }
        }
    };

    const confirmDeleteSelected = async () => {
        if (deleteSelected.size === 0) return;
        const blocks = [...deleteSelected];
        try {
            for (const block of blocks) {
                const msgId = resolveMsgId(block);
                if (msgId) await _supabase.from('messages').delete().eq('id', msgId);
                if (block.id) blockStateMap.delete(block.id);
                block.remove();
            }
            rebuildChatHistory();
        } catch (err) { console.error('Error deleting:', err); }
        exitDeleteMode(); updateEditableMarkers(); updateBotToolsVisibility();
    };

    // ── Edición de mensajes ───────────────────────────────────
    const startEdit = (block, role) => {
        if (block.classList.contains('editing')) return;
        block.classList.add('editing');
        const msgText = block.querySelector('.msg-text');
        const rawText = msgText.innerText;
        const editArea = document.createElement('textarea');
        editArea.className = 'msg-edit-area'; editArea.value = rawText; editArea.rows = Math.max(3, rawText.split('\n').length);
        const actions = document.createElement('div');
        actions.className = 'msg-edit-actions';
        actions.innerHTML = `<button class="btn-edit-confirm">Save</button><button class="btn-edit-cancel">Cancel</button>`;
        actions.querySelector('.btn-edit-confirm').onclick = () => confirmEdit(block, role, editArea.value);
        actions.querySelector('.btn-edit-cancel').onclick  = () => cancelEdit(block);
        const body = block.querySelector('.msg-body');
        msgText.style.display = 'none';
        body.appendChild(editArea); body.appendChild(actions);
        editArea.focus();
    };

    const cancelEdit = (block) => {
        block.classList.remove('editing');
        block.querySelector('.msg-text').style.display = '';
        block.querySelector('.msg-edit-area')?.remove();
        block.querySelector('.msg-edit-actions')?.remove();
    };

    const confirmEdit = async (block, role, newText) => {
        newText = newText.trim();
        if (!newText) return;
        const msgText = block.querySelector('.msg-text');
        if (role === 'user') msgText.innerHTML = formatNarrative(escapeHTML(newText));
        else {
            msgText.innerHTML = formatNarrative(newText);
            const state = blockStateMap.get(block.id);
            if (state?.alternatives.length > 0) state.alternatives[state.index].text = newText;
        }
        try {
            if (role === 'user') {
                const msgId = block.dataset.msgid;
                if (msgId) await _supabase.from('messages').update({ content: newText }).eq('id', msgId);
            } else {
                // Resolver el id real del mensaje del bot en la base
                const blockId = block.id;
                let realId = block.dataset.msgid;
                if (!realId && blockId && !blockId.startsWith('init_') && !blockId.startsWith('msg_')) realId = blockId;
                if (!realId && blockId === currentBotBlockId && currentBotMessageId) realId = currentBotMessageId;

                if (realId) {
                    const state = blockStateMap.get(block.id);
                    const payload = { content: newText };
                    // Si el mensaje tiene alternativas (el 1/15), también las guardamos.
                    // Si no, al recargar mostraría la alternativa vieja, no el texto editado.
                    if (state && state.alternatives.length > 0) {
                        payload.alternatives = JSON.stringify(state.alternatives);
                        payload.alt_index    = state.index;
                    }
                    await _supabase.from('messages').update(payload).eq('id', realId);
                }
            }
        } catch (err) { console.error('Edit save error:', err); }
        cancelEdit(block); rebuildChatHistory();
    };

    // ── Resetear chat ─────────────────────────────────────────
    const resetChat = async () => {
        document.getElementById('resetModal').classList.remove('show');
        enableInput(false);
        await _supabase.from('messages').delete().eq('conversation_id', conversationId);
        chatHistory = []; blockStateMap.clear(); currentBotBlockId = currentBotMessageId = null; memorySummary = '';
        await _supabase.from('conversations').update({ memory_summary: null }).eq('id', conversationId);
        document.getElementById('chatScrollArea').innerHTML = '';
        const gid = 'init_' + Date.now();
        blockStateMap.set(gid, { alternatives: [{ text: characterGreeting, rating: 0 }], index: 0, userPrompt: '', historySnapshot: [], generating: false });
        appendBotMessage(characterGreeting, gid, true);
        chatHistory.push({ role: 'assistant', content: characterGreeting });
        await _supabase.from('messages').insert({ conversation_id: conversationId, sender_type: 'bot', sender_name: characterName, content: characterGreeting });
        enableInput(true); scrollToBottom();
    };

    // ── Selector de persona ───────────────────────────────────
    const openPersonaSelector = async () => {
        toggleDropdown();
        const list = document.getElementById('personaList');
        list.innerHTML = '<p style="opacity:0.5;font-size:0.9rem;text-align:center;">Loading...</p>';
        document.getElementById('personaModal').classList.add('show');
        try {
            const { data: personas } = await _supabase.from('user_personas').select('id, name, description, is_default').eq('user_id', Auth.userId).order('created_at', { ascending: true });
            list.innerHTML = '';
            const addBtn = (p, isNone) => {
                const btn = document.createElement('button');
                btn.className = 'persona-option' + (isNone ? (activePersona === null ? ' active' : '') : (activePersona?.id === p?.id ? ' active' : ''));
                btn.innerHTML = `<strong>${isNone ? userDisplayName : p.name}</strong><span>${isNone ? 'My profile' + (activePersona === null ? ' · Active' : '') : (p.description ? p.description.substring(0, 60) + (p.description.length > 60 ? '...' : '') : 'No description') + (activePersona?.id === p?.id ? ' · Active' : '')}</span>`;
                btn.onclick = () => {
                    activePersona = isNone ? null : p;
                    document.getElementById('personaBtnTxt').innerHTML = `Persona: <em>${isNone ? 'My Profile' : p.name}</em>`;
                    document.getElementById('personaModal').classList.remove('show');
                    if (conversationId) {
                        _supabase.from('conversations').update({ persona_id: isNone ? null : p.id }).eq('id', conversationId).then(() => {}, () => {});
                    }
                };
                list.appendChild(btn);
            };
            addBtn(null, true);
            (personas || []).forEach(p => addBtn(p, false));
            if (!personas || personas.length === 0) {
                const hint = document.createElement('p');
                hint.style.cssText = 'opacity:0.5;font-size:0.85rem;text-align:center;padding:8px;';
                hint.innerHTML = 'No personas created yet. <a href="#" style="color:var(--btn-color);">Create one</a>';
                hint.querySelector('a').onclick = (e) => { e.preventDefault(); Router.go('myprofile'); };
                list.appendChild(hint);
            }
        } catch { list.innerHTML = '<p style="opacity:0.5;font-size:0.85rem;text-align:center;">Could not load personas.</p>'; }
    };

    // ── Ventana de memoria ────────────────────────────────────
    const openMemoryModal = () => {
        toggleDropdown();
        if (!conversationId) { showSystemMsg('Start chatting to set up memory.', false); return; }
        const ctxEl  = document.getElementById('memoryContext');
        const viewEl = document.getElementById('memorySummaryView');
        const editEl = document.getElementById('memorySummaryEdit');
        ctxEl.value = storyContext || '';
        document.getElementById('memoryContextCounter').textContent = `${(storyContext || '').length} / ${CONTEXT_MAX}`;
        viewEl.textContent = memorySummary || '';
        viewEl.style.display = 'block';
        editEl.style.display = 'none';
        editEl.value = memorySummary || '';
        document.getElementById('memorySummaryEditBtn').textContent = 'Edit';
        document.getElementById('memoryModal').classList.add('show');
    };

    const toggleSummaryEdit = () => {
        const viewEl = document.getElementById('memorySummaryView');
        const editEl = document.getElementById('memorySummaryEdit');
        const btn    = document.getElementById('memorySummaryEditBtn');
        const editing = editEl.style.display !== 'none';
        if (editing) { editEl.style.display = 'none'; viewEl.style.display = 'block'; btn.textContent = 'Edit'; }
        else { editEl.value = memorySummary || ''; editEl.style.display = 'block'; viewEl.style.display = 'none'; btn.textContent = 'Cancel'; }
    };

    const saveMemory = async () => {
        const newContext = document.getElementById('memoryContext').value.trim();
        const editEl = document.getElementById('memorySummaryEdit');
        const editingSummary = editEl.style.display !== 'none';
        const updates = { story_context: newContext };
        if (editingSummary) updates.memory_summary = editEl.value.trim();
        try {
            await _supabase.from('conversations').update(updates).eq('id', conversationId);
            storyContext = newContext;
            if (editingSummary) memorySummary = editEl.value.trim();
        } catch (e) { console.error('Memory save error:', e); }
        document.getElementById('memoryModal').classList.remove('show');
    };

    // ── Multichat: ventana de chats ────────────────────────────
    const fmtChatDate = (iso) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        } catch { return 'Chat'; }
    };

    const renderChatsList = (convs) => {
        const list = document.getElementById('chatsList');
        list.innerHTML = '';
        if (!convs || convs.length === 0) { list.innerHTML = '<p style="opacity:0.5;font-size:0.85rem;text-align:center;padding:8px;">Aún no hay chats.</p>'; return; }
        convs.forEach(c => {
            const row = document.createElement('div');
            row.className = 'chat-row' + (c.id === conversationId ? ' current' : '');
            const preview = (c.memory_summary || c.story_context || '').trim();
            const previewTxt = preview ? (preview.length > 70 ? preview.substring(0, 70) + '…' : preview) : 'Chat nuevo';
            const open = document.createElement('button');
            open.className = 'chat-row-open';
            open.innerHTML = `<strong>${fmtChatDate(c.created_at)}${c.id === conversationId ? ' · actual' : ''}</strong><span>${escapeHTML(previewTxt)}</span>`;
            open.onclick = () => switchToConversation(c.id);
            const del = document.createElement('button');
            del.className = 'chat-row-del';
            del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
            del.onclick = (e) => { e.stopPropagation(); promptDeleteChat(row, c.id); };
            row.appendChild(open); row.appendChild(del);
            list.appendChild(row);
        });
    };

    const promptDeleteChat = (row, convId) => {
        row.innerHTML = `<div class="chat-row-confirm"><span>¿Borrar este chat?</span><div><button class="no">No</button> <button class="yes">Sí</button></div></div>`;
        row.querySelector('.no').onclick = () => openChatsModal(true);
        row.querySelector('.yes').onclick = () => deleteChat(convId);
    };

    const closeAllOverlays = () => {
        document.getElementById('chatsModal').classList.remove('show');
        document.getElementById('optionsDropdown').classList.remove('show');
        document.getElementById('dropdownOverlay').classList.remove('show');
    };

    const goToChat = async (convId) => {
        closeAllOverlays();
        await loadHistory(convId);
    };

    const deleteChat = async (convId) => {
        const wasCurrent = (convId === conversationId);
        try { await _supabase.from('conversations').delete().eq('id', convId); } catch (e) { console.error('delete chat error', e); }
        if (wasCurrent) { await goToChat(null); }   // carga el más reciente que quede, o crea uno
        else { openChatsModal(true); }              // refresca la lista sin cerrar
    };

    const switchToConversation = async (convId) => {
        if (convId === conversationId) { closeAllOverlays(); return; }
        await goToChat(convId);
    };

    const createNewChat = async () => {
        try {
            const { data: newConv, error } = await _supabase.from('conversations').insert({ user_id: Auth.userId, character_id: characterId }).select('id').single();
            if (error || !newConv) { console.error('new chat error', error); return; }
            await goToChat(newConv.id);
        } catch (e) { console.error('new chat error', e); }
    };

    const openChatsModal = async (keepOpen = false) => {
        if (!keepOpen) toggleDropdown();
        if (!Auth.userId) return;
        const list = document.getElementById('chatsList');
        list.innerHTML = '<p style="opacity:0.5;font-size:0.9rem;text-align:center;padding:8px;">Cargando...</p>';
        document.getElementById('chatsModal').classList.add('show');
        try {
            const { data: convs } = await _supabase.from('conversations').select('id, created_at, memory_summary, story_context').eq('user_id', Auth.userId).eq('character_id', characterId).order('updated_at', { ascending: false });
            renderChatsList(convs);
        } catch (e) { list.innerHTML = '<p style="opacity:0.5;font-size:0.85rem;text-align:center;">No se pudieron cargar.</p>'; }
    };

    // ═══════════════════════════════════════════════════════════
    //  CONECTAR TODOS LOS BOTONES Y EVENTOS
    // ═══════════════════════════════════════════════════════════

    document.getElementById('backBtn').onclick        = () => Router.go('dashboard');
    document.getElementById('botMetaZone').onclick    = () => Router.go('character-profile', { id: characterId, from: 'room' });
    document.getElementById('botCreatorHeader').onclick = (e) => { e.stopPropagation(); if (botCreatorId) Router.go('user-profile', { id: botCreatorId, from: 'room' }); };
    document.getElementById('optionsBtn').onclick     = toggleDropdown;
    document.getElementById('dropdownOverlay').onclick = toggleDropdown;
    document.getElementById('dropdownProfile').onclick = () => { toggleDropdown(); Router.go('character-profile', { id: characterId, from: 'room' }); };

    document.getElementById('favBtn').onclick = async () => {
        isFavorite = !isFavorite; toggleDropdown();
        const btn = document.getElementById('favBtn');
        const txt = document.getElementById('favTxt');
        if (isFavorite) { btn.classList.add('fav-active'); txt.textContent = 'Saved in Favorites'; await _supabase.from('favorites').insert({ character_id: characterId, user_id: Auth.userId }); }
        else { btn.classList.remove('fav-active'); txt.textContent = 'Add to Favorites'; await _supabase.from('favorites').delete().eq('character_id', characterId).eq('user_id', Auth.userId); }
    };

    document.getElementById('editBotBtn').onclick   = () => { toggleDropdown(); Router.go('edit-character', { id: characterId }); };
    document.getElementById('personaBtn').onclick   = openPersonaSelector;
    document.getElementById('memoryBtn').onclick     = openMemoryModal;
    document.getElementById('memoryCancelBtn').onclick = () => document.getElementById('memoryModal').classList.remove('show');
    document.getElementById('memorySaveBtn').onclick = saveMemory;
    document.getElementById('memorySummaryEditBtn').onclick = toggleSummaryEdit;
    document.getElementById('memoryContext').oninput = function() { document.getElementById('memoryContextCounter').textContent = `${this.value.length} / ${CONTEXT_MAX}`; };
    document.getElementById('chatsBtn').onclick      = () => openChatsModal();
    document.getElementById('chatsCancelBtn').onclick = () => document.getElementById('chatsModal').classList.remove('show');
    document.getElementById('newChatBtn').onclick    = createNewChat;
    document.getElementById('personaCancelBtn').onclick = () => document.getElementById('personaModal').classList.remove('show');
    document.getElementById('deleteMsgBtn').onclick = enterDeleteMode;
    document.getElementById('deleteCancelBtn').onclick  = exitDeleteMode;
    document.getElementById('deleteConfirmBtn').onclick = confirmDeleteSelected;

    document.getElementById('resetChatBtn').onclick  = () => { toggleDropdown(); document.getElementById('resetModal').classList.add('show'); };
    document.getElementById('resetCancelBtn').onclick = () => document.getElementById('resetModal').classList.remove('show');
    document.getElementById('resetConfirmBtn').onclick = resetChat;

    document.getElementById('reportBtn').onclick = () => { toggleDropdown(); document.getElementById('reportReason').value = ''; document.getElementById('reportCounter').textContent = '0 / 200'; document.getElementById('reportModal').classList.add('show'); };
    document.getElementById('reportCancelBtn').onclick = () => document.getElementById('reportModal').classList.remove('show');
    document.getElementById('reportReason').oninput = function() { document.getElementById('reportCounter').textContent = `${this.value.length} / 200`; };
    document.getElementById('reportSubmitBtn').onclick = async () => {
        const reason = document.getElementById('reportReason').value.trim();
        document.getElementById('reportModal').classList.remove('show');
        try { await _supabase.from('reports').insert({ character_id: characterId, reported_by: Auth.userId, reason: reason || 'No reason specified', created_at: new Date().toISOString() }); showSystemMsg('Thank you. Your report has been submitted.', false); } catch { showSystemMsg('Report submitted.', false); }
    };

    document.getElementById('noKeyLink').onclick = (e) => { e.preventDefault(); Router.go('api-settings'); };
    document.getElementById('loadArchiveBtn').onclick = loadArchivedMessages;
    document.getElementById('sendBtn').onclick = sendMessage;
    document.getElementById('userInput').addEventListener('keydown', (e) => {
        const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); sendMessage(); }
    });
    document.getElementById('userInput').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 140) + 'px';
    });
    document.getElementById('userInput').addEventListener('click', () => {
        if (!Auth.userId) UI.showLoginPopup('Join Froggie AI to start chatting!');
    });

    // ── Inicializar ───────────────────────────────────────────
    await Promise.all([loadCharacter(), loadApiSettings(), loadUserProfile()]);

    if (Auth.userId) {
        await loadHistory();
        await checkFavorite();
    } else {
        showGuestGreeting();
    }
}
