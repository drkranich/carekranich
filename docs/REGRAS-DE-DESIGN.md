# Regras de Design — Care Kranich (obrigatórias em todo o projeto)

1. **Calendários**: NUNCA usar `<input type="date">` ou `datetime-local` nativos. Sempre usar `GlassDatePicker` (data) ou `GlassDateTimePicker` (data+hora) de `@/components/app/GlassDatePicker`. Suportam modo controlado (`value`/`onChange`) e não controlado (`name`/`defaultValue`).
2. **Dropdowns/selects**: NUNCA usar `<select>` nativo. Sempre `GlassSelect` de `@/components/app/GlassSelect`.
3. **Painéis flutuantes** (dropdown, calendário, menus): renderizar via portal em `document.body` com `position: fixed` e `zIndex: 9999` — nunca podem ser cortados ou cobertos por cards com `backdrop-blur`.
4. **Glassmorphism** em todos os formulários, listas, cards e controles: `border-white/70 bg-white/55 shadow-soft backdrop-blur-xl` (painéis abertos: `bg-white/92 backdrop-blur-2xl shadow-elevated ring-1 ring-white/40`).
5. **Idioma**: todo texto de interface em **PT-BR com acentuação correta**. Proibido texto sem acento (nao, usuario, clinica...). Nunca acentuar identificadores de código (imports, componentes como `Video`/`Area` do lucide/recharts).
6. **PDFs**: usar `downloadPdf` de `@/lib/pdf` (WinAnsi — aceita acentos).
7. **Datas exibidas**: `toLocaleDateString("pt-BR")` / `toLocaleTimeString("pt-BR")`.
8. Identidade visual Care Kranich: tons olive/cream/ivory/baby/wine/gold, cantos `rounded-xl`/`rounded-2xl`, pills `rounded-full`.
