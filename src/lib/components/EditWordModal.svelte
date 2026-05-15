<script lang="ts">
    import { X, BookOpen, PenLine, Lightbulb } from "@lucide/svelte";
    import { tick } from "svelte";
    import { joinPersonalNote, splitPersonalNote } from "$lib/personalNoteSplit";
    import type { VocabularyWord } from "$lib/types";

    const POS_OPTIONS = [
        { value: "noun" as const, label: "Noun" },
        { value: "verb" as const, label: "Verb" },
        { value: "adjective" as const, label: "Adj" },
        { value: "adverb" as const, label: "Adv" },
    ];

    const SOFT_CHAR_GUIDE = 400;

    type Draft = {
        meaningId: string;
        partOfSpeech: (typeof POS_OPTIONS)[number]["value"];
        dictionaryDisplay: string;
        personalMeaning: string;
        mnemonicNote: string;
        personalExample: string;
    };

    let {
        open = $bindable(false),
        word = $bindable(null) as VocabularyWord | null,
        onSaved,
    } = $props<{
        open: boolean;
        word: VocabularyWord | null;
        onSaved: () => void | Promise<void>;
    }>();

    let drafts = $state<Draft[]>([]);
    let saving = $state(false);
    let error = $state("");

    $effect(() => {
        if (!open || !word) return;
        error = "";
        drafts = word.meanings.map((m: VocabularyWord["meanings"][number]) => {
            const { body, mnemonic } = splitPersonalNote(m.personalMeaning);
            return {
                meaningId: m.id,
                partOfSpeech: m.type,
                dictionaryDisplay: m.dictionaryMeaning?.trim() ?? "",
                personalMeaning: body,
                mnemonicNote: mnemonic,
                personalExample: m.examples?.[0]?.personalExample ?? "",
            };
        });
        void tick().then(() => {
            document
                .querySelectorAll<HTMLTextAreaElement>("[data-edit-modal-ta]")
                .forEach(autoResize);
        });
    });

    function close() {
        open = false;
        word = null;
        error = "";
    }

    function autoResize(el: HTMLTextAreaElement) {
        el.style.height = "auto";
        el.style.height = `${Math.min(Math.max(el.scrollHeight, 92), 280)}px`;
    }

    async function save() {
        if (!word) return;
        saving = true;
        error = "";
        try {
            const res = await fetch(`/api/words/${word.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meanings: drafts.map((d) => ({
                        id: d.meaningId,
                        type: d.partOfSpeech,
                        personalMeaning: joinPersonalNote(
                            d.personalMeaning,
                            d.mnemonicNote,
                        ),
                        personalExample: d.personalExample.trim() || null,
                    })),
                }),
            });
            if (!res.ok) {
                const j = (await res.json().catch(() => null)) as {
                    error?: string;
                } | null;
                throw new Error(j?.error || "Could not save changes");
            }
            await onSaved();
            close();
        } catch (e) {
            error =
                e instanceof Error ? e.message : "Something went wrong. Try again.";
        } finally {
            saving = false;
        }
    }
</script>

{#if open && word}
    <div
        class="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-sheet-title"
    >
        <button
            type="button"
            class="animate-backdrop-in absolute inset-0 bg-black/60 backdrop-blur-[3px]"
            aria-label="Close"
            onclick={close}
        ></button>

        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            role="document"
            tabindex="-1"
            class="animate-sheet-enter relative flex max-h-[min(92dvh,720px)] w-full max-w-[min(100vw,28rem)] flex-col rounded-t-[1.35rem] border border-white/[0.07] bg-[var(--surface-1)] shadow-[0_-16px_48px_rgba(0,0,0,0.4)] sm:max-h-[min(88dvh,680px)] sm:max-w-2xl sm:rounded-2xl lg:max-w-3xl"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
        >
            <div class="mx-auto mt-2 mb-0.5 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" aria-hidden="true"></div>

            <header class="shrink-0 px-5 pb-3 pt-2 sm:pt-5">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                        <h2
                            id="edit-sheet-title"
                            class="text-[1.375rem] font-semibold capitalize leading-tight tracking-tight text-white sm:text-[1.75rem] lg:text-[1.875rem]"
                        >
                            {word.word}
                        </h2>
                        <p class="mt-1.5 max-w-xl text-[12px] leading-relaxed text-gray-500 sm:text-[13px]">
                            Add your own meaning, notes, or examples for this word.
                        </p>
                    </div>
                    <button
                        type="button"
                        onclick={close}
                        class="shrink-0 rounded-full p-2 text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-300"
                        aria-label="Close"
                    >
                        <X size={20} strokeWidth={2} />
                    </button>
                </div>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
                {#if error}
                    <p
                        class="mb-4 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-3 py-2.5 text-[13px] text-red-300"
                        role="alert"
                    >
                        {error}
                    </p>
                {/if}

                <div class="space-y-8 sm:space-y-10">
                    {#each drafts as d, idx (d.meaningId)}
                        <section class="space-y-5">
                            {#if word.meanings.length > 1}
                                <p
                                    class="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500"
                                >
                                    Sense {idx + 1}
                                </p>
                            {/if}

                            <div>
                                <span
                                    class="text-[12px] font-semibold uppercase tracking-wide text-brand/85"
                                    >Word type</span
                                >
                                <div
                                    class="mt-2 flex flex-wrap gap-1 rounded-xl bg-white/[0.035] p-1"
                                    role="group"
                                    aria-label="Part of speech"
                                >
                                    {#each POS_OPTIONS as opt}
                                        <button
                                            type="button"
                                            onclick={() => {
                                                d.partOfSpeech = opt.value;
                                            }}
                                            class="min-h-11 min-w-[4.25rem] flex-1 rounded-lg px-2 py-2 text-center text-[12px] font-medium transition sm:min-w-0 sm:flex-1 sm:px-3 {d.partOfSpeech ===
                                            opt.value
                                                ? 'bg-brand/18 text-brand shadow-[0_1px_0_rgba(0,0,0,0.15)]'
                                                : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'}"
                                        >
                                            {opt.label}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <div class="grid gap-5 lg:grid-cols-2 lg:gap-8">
                                <div class="space-y-5">
                                    <div>
                                        <div
                                            class="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-gray-500"
                                        >
                                            <BookOpen
                                                size={14}
                                                class="text-brand/70"
                                                strokeWidth={2}
                                                aria-hidden="true"
                                            />
                                            Dictionary meaning
                                        </div>
                                        <div
                                            class="rounded-xl border border-white/[0.055] bg-white/[0.025] px-3.5 py-3.5 text-[14px] leading-[1.65] text-gray-300 sm:text-[15px]"
                                        >
                                            {#if d.dictionaryDisplay}
                                                {d.dictionaryDisplay}
                                            {:else}
                                                <span class="italic text-gray-600"
                                                    >No dictionary definition for this sense.</span
                                                >
                                            {/if}
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            class="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-brand/85"
                                            for={`meaning-${d.meaningId}`}
                                        >
                                            <PenLine size={14} class="opacity-85" aria-hidden="true" />
                                            Your meaning
                                        </label>
                                        <div class="relative">
                                            <textarea
                                                id={`meaning-${d.meaningId}`}
                                                data-edit-modal-ta
                                                bind:value={d.personalMeaning}
                                                rows={2}
                                                maxlength={4000}
                                                oninput={(e) =>
                                                    autoResize(e.currentTarget)}
                                                placeholder="Write your own understanding of this word…"
                                                class="min-h-[6rem] w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 pb-7 text-[15px] leading-relaxed text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-brand/35 focus:bg-white/[0.04] focus:ring-1 focus:ring-brand/25"
                                            ></textarea>
                                            <span
                                                class="pointer-events-none absolute bottom-2 right-2.5 text-[11px] tabular-nums {d
                                                    .personalMeaning.length >
                                                SOFT_CHAR_GUIDE
                                                    ? 'text-brand/75'
                                                    : 'text-gray-600'}"
                                                aria-live="polite"
                                            >
                                                {d.personalMeaning.length}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="space-y-5">
                                    <div>
                                        <label
                                            class="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-brand/85"
                                            for={`mnemonic-${d.meaningId}`}
                                        >
                                            <Lightbulb size={14} class="opacity-85" aria-hidden="true" />
                                            Your note / mnemonic
                                        </label>
                                        <div class="relative">
                                            <textarea
                                                id={`mnemonic-${d.meaningId}`}
                                                data-edit-modal-ta
                                                bind:value={d.mnemonicNote}
                                                rows={2}
                                                maxlength={4000}
                                                oninput={(e) =>
                                                    autoResize(e.currentTarget)}
                                                placeholder="A trick or memory that helps you remember…"
                                                class="min-h-[5rem] w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 pb-7 text-[15px] leading-relaxed text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-brand/35 focus:bg-white/[0.04] focus:ring-1 focus:ring-brand/25"
                                            ></textarea>
                                            <span
                                                class="pointer-events-none absolute bottom-2 right-2.5 text-[11px] tabular-nums {d
                                                    .mnemonicNote.length >
                                                SOFT_CHAR_GUIDE
                                                    ? 'text-brand/75'
                                                    : 'text-gray-600'}"
                                            >
                                                {d.mnemonicNote.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            class="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-brand/85"
                                            for={`example-${d.meaningId}`}
                                        >
                                            Your example
                                        </label>
                                        <div class="relative">
                                            <textarea
                                                id={`example-${d.meaningId}`}
                                                data-edit-modal-ta
                                                bind:value={d.personalExample}
                                                rows={2}
                                                maxlength={4000}
                                                oninput={(e) =>
                                                    autoResize(e.currentTarget)}
                                                placeholder="Write a sentence you’ll remember…"
                                                class="min-h-[6rem] w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 pb-7 text-[15px] leading-relaxed text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-brand/35 focus:bg-white/[0.04] focus:ring-1 focus:ring-brand/25"
                                            ></textarea>
                                            <span
                                                class="pointer-events-none absolute bottom-2 right-2.5 text-[11px] tabular-nums {d
                                                    .personalExample.length >
                                                SOFT_CHAR_GUIDE
                                                    ? 'text-brand/75'
                                                    : 'text-gray-600'}"
                                            >
                                                {d.personalExample.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        class="rounded-xl border border-brand/15 bg-brand/[0.05] px-3.5 py-3"
                                    >
                                        <p
                                            class="text-[11px] font-semibold uppercase tracking-wide text-brand/75"
                                        >
                                            Ideas
                                        </p>
                                        <ul
                                            class="mt-2 space-y-1.5 text-[12px] leading-snug text-gray-500"
                                        >
                                            <li>Describe where you heard this word.</li>
                                            <li>Write a funny mnemonic.</li>
                                            <li>Create a sentence from real life.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>
                    {/each}
                </div>
            </div>

            <footer
                class="sticky bottom-0 z-10 flex shrink-0 gap-3 border-t border-white/[0.06] bg-[var(--surface-1)]/96 px-5 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5"
            >
                <button
                    type="button"
                    onclick={close}
                    class="min-h-12 flex-1 rounded-xl border border-white/[0.1] text-[14px] font-medium text-gray-400 transition hover:bg-white/[0.04] active:scale-[0.99]"
                    disabled={saving}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onclick={() => void save()}
                    disabled={saving}
                    class="min-h-12 flex-[1.15] rounded-xl bg-gradient-to-b from-brand-deep to-[color:var(--color-brand-darker)] text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
                >
                    {saving ? "Saving…" : "Save"}
                </button>
            </footer>
        </div>
    </div>
{/if}
