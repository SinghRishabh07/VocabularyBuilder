<script lang="ts">
    import { browser } from "$app/environment";
    import { invalidateAll } from "$app/navigation";
    import {
        ScanText,
        Loader,
        CircleAlert,
        X,
        Check,
        BookOpen,
        Plus,
        Sparkles,
        Brain,
    } from "@lucide/svelte";
    import { toast } from "svelte-sonner";
    import type {
        AnalyzeResponse,
        AnalyzedWord,
        AddWordPayload,
        SaveWordsResponse,
    } from "$lib/types";

    const MIN_CHARS = 20;
    const MAX_CHARS = 5000;
    const DRAFT_KEY = "vocab-analyze-draft";

    const SAMPLE =
        "The committee's decision was met with considerable skepticism. Critics argued that the proposal, though ostensibly pragmatic, would merely exacerbate the existing disparity between urban and rural schools. Its proponents, undeterred, insisted that incremental reform was preferable to the inertia that had plagued previous administrations.";

    let text = $state("");
    let isAnalyzing = $state(false);
    let isSaving = $state(false);
    let error = $state("");
    let result = $state<AnalyzeResponse | null>(null);
    /** words selected for saving */
    let selected = $state<Set<string>>(new Set());
    /** words that are now in the collection (saved now or already there) */
    let inCollection = $state<Set<string>>(new Set());

    let charCount = $derived(text.length);
    let canAnalyze = $derived(
        text.trim().length >= MIN_CHARS && charCount <= MAX_CHARS && !isAnalyzing,
    );
    let selectable = $derived(
        (result?.words ?? []).filter((w) => !inCollection.has(w.word)),
    );
    let selectedCount = $derived(
        selectable.filter((w) => selected.has(w.word)).length,
    );
    let allSelected = $derived(
        selectable.length > 0 && selectedCount === selectable.length,
    );

    $effect(() => {
        if (!browser) return;
        try {
            const draft = sessionStorage.getItem(DRAFT_KEY);
            if (draft) text = draft;
        } catch {
            /* storage unavailable */
        }
    });

    function persistDraft() {
        if (!browser) return;
        try {
            sessionStorage.setItem(DRAFT_KEY, text);
        } catch {
            /* ignore */
        }
    }

    async function analyze(ev?: Event) {
        ev?.preventDefault();
        if (!canAnalyze) return;
        isAnalyzing = true;
        error = "";
        result = null;
        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            const body = (await res.json().catch(() => null)) as
                | (AnalyzeResponse & { error?: string })
                | null;
            if (!res.ok || !body) {
                throw new Error(body?.error ?? "Couldn't analyze the text. Please try again.");
            }
            result = body;
            selected = new Set(body.words.map((w) => w.word));
            inCollection = new Set();
        } catch (err) {
            error = err instanceof Error ? err.message : "Something went wrong.";
        } finally {
            isAnalyzing = false;
        }
    }

    function toggle(word: string) {
        if (inCollection.has(word)) return;
        const next = new Set(selected);
        if (next.has(word)) next.delete(word);
        else next.add(word);
        selected = next;
    }

    function toggleAll() {
        selected = allSelected ? new Set() : new Set(selectable.map((w) => w.word));
    }

    function toPayload(w: AnalyzedWord): AddWordPayload {
        return {
            word: w.word,
            meanings: [
                {
                    pos: w.pos,
                    definitions: [w.meaning],
                    examples: [w.sentence || w.example || ""].filter(Boolean),
                },
            ],
        };
    }

    async function saveSelected() {
        if (!result || isSaving) return;
        const toSave = selectable.filter((w) => selected.has(w.word));
        if (!toSave.length) return;
        isSaving = true;
        try {
            const res = await fetch("/api/words", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ words: toSave.map(toPayload) }),
            });
            const body = (await res.json().catch(() => null)) as
                | (SaveWordsResponse & { error?: string })
                | null;
            if (!res.ok || !body) {
                throw new Error(body?.error ?? "Failed to save words");
            }
            const done = new Set(inCollection);
            for (const c of body.created) done.add(c.word);
            for (const s of body.skipped) done.add(s);
            inCollection = done;
            const n = body.created.length;
            if (n > 0) {
                toast.success(`Added ${n} ${n === 1 ? "word" : "words"} to your collection`);
            }
            if (body.skipped.length > 0) {
                toast.info(
                    `${body.skipped.length} already in your collection`,
                    { description: body.skipped.join(", ") },
                );
            }
            await invalidateAll();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save words");
        } finally {
            isSaving = false;
        }
    }

    function reset() {
        result = null;
        error = "";
        selected = new Set();
        inCollection = new Set();
    }

    function useSample() {
        text = SAMPLE;
        persistDraft();
        reset();
    }

    /** Split a sentence so the target word can be highlighted without {@html}. */
    function highlight(sentence: string, surface: string) {
        const i = sentence.toLowerCase().indexOf(surface.toLowerCase());
        if (i === -1 || !surface) return [{ text: sentence, hit: false }];
        return [
            { text: sentence.slice(0, i), hit: false },
            { text: sentence.slice(i, i + surface.length), hit: true },
            { text: sentence.slice(i + surface.length), hit: false },
        ];
    }

    function onKeydown(e: KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void analyze();
    }
</script>

<svelte:head>
    <title>Analyze text · VocabVault</title>
</svelte:head>

<div
    class="min-h-full bg-[var(--surface-0)] text-gray-100 font-sans selection:bg-brand-darker/40 selection:text-white"
>
    <main class="mx-auto max-w-xl px-4 pt-4 pb-6 md:pt-6 lg:max-w-2xl">
        <h1 class="text-[1.375rem] md:text-[1.5rem] font-semibold tracking-tight text-white">
            Analyze text
        </h1>
        <p class="mt-0.5 text-[13px] leading-snug text-gray-500">
            Paste a paragraph, article or book excerpt. We'll pick out the words worth learning.
        </p>

        <form class="mt-3" onsubmit={analyze}>
            <label class="sr-only" for="analyze-text">Text to analyze</label>
            <div
                class="rounded-2xl border border-white/[0.08] bg-[var(--surface-1)] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-[border-color,box-shadow] duration-200 focus-within:border-brand/45 focus-within:ring-1 focus-within:ring-brand/35"
            >
                <textarea
                    id="analyze-text"
                    bind:value={text}
                    oninput={persistDraft}
                    onkeydown={onKeydown}
                    rows="7"
                    maxlength={MAX_CHARS}
                    placeholder="Paste or type a paragraph…"
                    class="block min-h-40 w-full resize-y bg-transparent px-3.5 pt-3 pb-2 text-[15px] leading-relaxed text-gray-100 placeholder:text-gray-600 outline-none"
                ></textarea>
                <div class="flex items-center justify-between gap-2 border-t border-white/[0.05] px-3 py-2">
                    <div class="flex items-center gap-1">
                        {#if text}
                            <button
                                type="button"
                                onclick={() => {
                                    text = "";
                                    persistDraft();
                                    reset();
                                }}
                                class="rounded-lg px-2 py-1.5 text-[12px] font-medium text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-300"
                            >
                                Clear
                            </button>
                        {:else}
                            <button
                                type="button"
                                onclick={useSample}
                                class="rounded-lg px-2 py-1.5 text-[12px] font-medium text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-300"
                            >
                                Try a sample
                            </button>
                        {/if}
                        <span
                            class="text-[11px] tabular-nums {charCount > MAX_CHARS * 0.9
                                ? 'text-amber-400/80'
                                : 'text-gray-600'}"
                        >
                            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                        </span>
                    </div>
                    <button
                        type="submit"
                        disabled={!canAnalyze}
                        class="flex items-center gap-2 rounded-xl bg-brand-deep px-3 py-2 text-[14px] font-semibold text-white transition hover:bg-brand active:scale-[0.98] touch-manipulation disabled:opacity-50 disabled:hover:bg-brand-deep disabled:active:scale-100"
                    >
                        {#if isAnalyzing}
                            <Loader size={17} class="animate-spin" aria-hidden="true" />
                            Analyzing…
                        {:else}
                            <ScanText size={17} strokeWidth={2.25} aria-hidden="true" />
                            Analyze
                        {/if}
                    </button>
                </div>
            </div>
            {#if text.trim().length > 0 && text.trim().length < MIN_CHARS}
                <p class="mt-2 px-1 text-[12px] text-gray-500">
                    Add a bit more text — at least a full sentence.
                </p>
            {/if}
        </form>

        <div class="mt-5" aria-live="polite">
            {#if error}
                <div
                    class="relative flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-3 text-[14px] text-red-300"
                    role="alert"
                >
                    <CircleAlert size={18} class="mt-0.5 shrink-0" strokeWidth={2} />
                    <p class="flex-1 pr-8 leading-snug">{error}</p>
                    <button
                        type="button"
                        onclick={() => (error = "")}
                        class="absolute top-2.5 right-2.5 rounded-lg p-1.5 text-red-300/90 transition hover:bg-red-500/10 hover:text-red-200"
                        aria-label="Dismiss error"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </div>
            {/if}

            {#if isAnalyzing}
                <p class="mb-3 text-[13px] text-gray-500">Reading your text and checking the dictionary…</p>
                <ul class="space-y-2" aria-hidden="true">
                    {#each [0, 1, 2] as i (i)}
                        <li class="animate-pulse rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4">
                            <div class="h-4 w-28 rounded bg-white/[0.07]"></div>
                            <div class="mt-3 h-3 w-full rounded bg-white/[0.05]"></div>
                            <div class="mt-2 h-3 w-2/3 rounded bg-white/[0.05]"></div>
                        </li>
                    {/each}
                </ul>
            {/if}

            {#if result && !isAnalyzing}
                {#if result.words.length === 0}
                    <div
                        class="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center"
                    >
                        <p class="text-[14px] text-gray-300">No new vocabulary found</p>
                        <p class="mt-1 text-[13px] text-gray-500">
                            {#if result.skippedSaved.length}
                                The interesting words here are already in your collection.
                            {:else}
                                This text mostly uses everyday words. Try something more advanced.
                            {/if}
                        </p>
                    </div>
                {:else}
                    <div class="mb-3 flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            <h2 class="text-[1.125rem] font-semibold tracking-tight text-white">
                                {result.words.length}
                                {result.words.length === 1 ? "word" : "words"} worth learning
                            </h2>
                            <p class="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                                {#if result.engine === "ai"}
                                    <Sparkles size={11} aria-hidden="true" /> Picked with AI, meanings matched to context
                                {:else}
                                    <BookOpen size={11} aria-hidden="true" /> Dictionary meanings matched to context
                                {/if}
                            </p>
                        </div>
                        {#if selectable.length > 0}
                            <button
                                type="button"
                                onclick={toggleAll}
                                class="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-gray-300 transition-colors hover:border-brand/25 hover:bg-brand/10 hover:text-white touch-manipulation"
                            >
                                {allSelected ? "Deselect all" : "Select all"}
                            </button>
                        {/if}
                    </div>

                    <ul class="space-y-2" role="list">
                        {#each result.words as w (w.word)}
                            {@const saved = inCollection.has(w.word)}
                            {@const isOn = saved || selected.has(w.word)}
                            <li>
                                <button
                                    type="button"
                                    onclick={() => toggle(w.word)}
                                    disabled={saved}
                                    aria-pressed={isOn}
                                    class="group flex w-full gap-3 rounded-2xl border p-4 text-left transition-colors duration-150 touch-manipulation {saved
                                        ? 'border-emerald-500/15 bg-emerald-500/[0.04] cursor-default'
                                        : isOn
                                          ? 'border-brand/30 bg-brand/[0.06]'
                                          : 'border-white/[0.06] bg-[var(--surface-1)] hover:bg-white/[0.04]'}"
                                >
                                    <span
                                        class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors {saved
                                            ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                            : isOn
                                              ? 'border-brand bg-brand text-white'
                                              : 'border-white/20 text-transparent'}"
                                        aria-hidden="true"
                                    >
                                        <Check size={13} strokeWidth={3} />
                                    </span>
                                    <span class="min-w-0 flex-1">
                                        <span class="flex flex-wrap items-center gap-2">
                                            <span class="text-[16px] font-semibold capitalize tracking-tight text-white">
                                                {w.word}
                                            </span>
                                            <span
                                                class="inline-block rounded-md border border-brand/20 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand"
                                            >
                                                {w.pos}
                                            </span>
                                            {#if saved}
                                                <span class="text-[11px] font-medium text-emerald-300">In collection</span>
                                            {/if}
                                        </span>
                                        <span class="mt-1.5 block text-[14px] leading-relaxed text-gray-200">
                                            {w.meaning}
                                        </span>
                                        {#if w.simple}
                                            <span class="mt-1 block text-[13px] leading-relaxed text-gray-400">
                                                <span class="text-gray-500">In simple terms:</span>
                                                {w.simple}
                                            </span>
                                        {/if}
                                        {#if w.sentence}
                                            <span
                                                class="mt-2.5 block border-l-2 border-white/10 pl-3 text-[13px] italic leading-relaxed text-gray-400"
                                            >
                                                {#each highlight(w.sentence, w.surface) as seg, i (i)}
                                                    {#if seg.hit}
                                                        <mark class="rounded bg-brand/15 px-0.5 not-italic font-medium text-brand-bright">{seg.text}</mark>
                                                    {:else}
                                                        {seg.text}
                                                    {/if}
                                                {/each}
                                            </span>
                                        {/if}
                                    </span>
                                </button>
                            </li>
                        {/each}
                    </ul>

                    {#if result.skippedSaved.length}
                        <p class="mt-3 px-1 text-[12px] text-gray-500">
                            Already in your collection: {result.skippedSaved.join(", ")}
                        </p>
                    {/if}

                    <div
                        class="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mt-4 lg:bottom-4"
                    >
                        {#if selectable.length > 0}
                            <button
                                type="button"
                                onclick={() => void saveSelected()}
                                disabled={selectedCount === 0 || isSaving}
                                class="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-3 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition hover:bg-brand active:scale-[0.99] touch-manipulation disabled:border disabled:border-white/[0.08] disabled:bg-[var(--surface-2)] disabled:text-gray-500 disabled:active:scale-100"
                            >
                                {#if isSaving}
                                    <Loader size={18} class="animate-spin" aria-hidden="true" />
                                    Saving…
                                {:else}
                                    <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
                                    {selectedCount === 0
                                        ? "Select words to add"
                                        : `Add ${selectedCount} ${selectedCount === 1 ? "word" : "words"}`}
                                {/if}
                            </button>
                        {:else}
                            <a
                                href="/revise"
                                class="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-[var(--surface-1)] px-4 py-3 text-[14px] font-semibold text-emerald-300 shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition hover:bg-emerald-500/10"
                            >
                                <Brain size={17} aria-hidden="true" />
                                All saved. Revise them now
                            </a>
                        {/if}
                    </div>
                {/if}
            {/if}
        </div>
    </main>
</div>
