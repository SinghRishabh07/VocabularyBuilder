/** Persist two UI fields (meaning + mnemonic) in one DB `personalMeaning` string. */
export function splitPersonalNote(raw: string | null | undefined): {
    body: string;
    mnemonic: string;
} {
    const s = raw ?? "";
    const i = s.indexOf("\n\n");
    if (i === -1) return { body: s, mnemonic: "" };
    return { body: s.slice(0, i), mnemonic: s.slice(i + 2) };
}

export function joinPersonalNote(body: string, mnemonic: string): string | null {
    const b = body.trim();
    const m = mnemonic.trim();
    if (!b && !m) return null;
    if (!m) return b || null;
    if (!b) return m;
    return `${b}\n\n${m}`;
}
