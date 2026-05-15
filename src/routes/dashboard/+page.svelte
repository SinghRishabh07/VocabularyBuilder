<script lang="ts">
    import { browser } from "$app/environment";
    import { afterNavigate, goto, invalidateAll } from "$app/navigation";
    import { tick } from "svelte";
    import {
        Search,
        Loader,
        CircleAlert,
        Plus,
        BookOpen,
        X,
    } from "@lucide/svelte";
    import type {
        SearchResult,
        DictEntry,
        SearchWordResponse,
        AddWordPayload,
    } from "$lib/types";
    import RecentWordRow from "$lib/components/RecentWordRow.svelte";
    import { splitPersonalNote } from "$lib/personalNoteSplit";
    import { toast } from "svelte-sonner";

    type DashboardRecent = {
        word: string;
        createdAt: Date;
        meanings: {
            dictionaryMeaning: string | null;
            type: string;
            personalMeaning: string | null;
            examples: {
                dictionaryExample: string | null;
                personalExample: string | null;
            }[];
        }[];
    };

    let { data } = $props<{ data: { recentWords: DashboardRecent[] } }>();

    let searchQuery = $state("");
    let searchInput: HTMLInputElement | null = $state(null);
    let isLoading = $state(false);
    let isSavingWord = $state(false);
    let error = $state("");
    let searchResult = $state<SearchResult>(null);
    let isInVocab = $state(false);

    let recentSearches = $state<string[]>([]);
    const RECENT_SEARCH_KEY = "vocab-recent-searches";

    let selectedRecent = $state<DashboardRecent | null>(null);

    function loadRecentSearches() {
        if (!browser) return;
        try {
            const raw = localStorage.getItem(RECENT_SEARCH_KEY);
            const parsed = raw ? (JSON.parse(raw) as string[]) : [];
            recentSearches = Array.isArray(parsed)
                ? parsed.filter((s) => typeof s === "string").slice(0, 8)
                : [];
        } catch {
            recentSearches = [];
        }
    }

    function persistRecent(term: string) {
        if (!browser) return;
        const t = term.trim().toLowerCase();
        if (!t) return;
        const next = [t, ...recentSearches.filter((x) => x !== t)].slice(0, 8);
        recentSearches = next;
        localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
    }

    $effect(() => {
        loadRecentSearches();
    });

    afterNavigate(async ({ to }) => {
        if (!browser || !to) return;
        if (to.url.pathname !== "/dashboard") return;
        if (to.url.searchParams.get("focus") !== "search") return;
        await tick();
        searchInput?.focus();
        const clean = new URL(to.url.href);
        clean.searchParams.delete("focus");
        await goto(`${clean.pathname}${clean.search}`, { replaceState: true, noScroll: true });
    });

    async function handleSearch(ev?: Event) {
        ev?.preventDefault();
        if (!searchQuery.trim()) return;

        isLoading = true;
        error = "";
        searchResult = null;
        isInVocab = false;

        try {
            const wordToSearch = searchQuery.trim().toLowerCase();

            const wordSearchResponse = await fetch(
                `/api/search?word=${encodeURIComponent(wordToSearch)}`,
            );
            const wordSearchData =
                (await wordSearchResponse.json()) as SearchWordResponse;
            if (wordSearchData.status === "failed") {
                throw new Error(
                    wordSearchData.message || "An unknown error occurred.",
                );
            }

            if (wordSearchData.data !== null) {
                searchResult = wordSearchData.data;
                isInVocab = true;
                isLoading = false;
                persistRecent(wordToSearch);
                searchQuery = "";
                return;
            }

            const response = await fetch(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(wordToSearch)}`,
            );

            if (!response.ok) {
                throw new Error(
                    "Word not found in the dictionary. Please check your spelling.",
                );
            }

            const apiData = (await response.json()) as DictEntry[];
            const entry = apiData[0];

            searchResult = {
                word: entry.word,
                allMeanings: entry.meanings.map((m) => ({
                    pos: m.partOfSpeech,
                    definitions: m.definitions
                        .slice(0, 2)
                        .map((d) => d.definition),
                })),
            };
            isInVocab = false;
            persistRecent(wordToSearch);
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred.";
            error = message;
            console.error("Search Error:", err);
            toast.error("Failed to search for word. Please try again");
        } finally {
            isLoading = false;
        }
    }

    function applyChip(term: string) {
        searchQuery = term;
        void handleSearch();
    }

    async function saveWordToCollection() {
        if (!searchResult || isInVocab || isSavingWord) return;

        const payload: AddWordPayload = {
            word: searchResult.word,
            meanings: searchResult.allMeanings.map((m) => ({
                pos: m.pos,
                definitions: m.definitions,
            })),
        };

        isSavingWord = true;
        try {
            const response = await fetch("/api/words", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (response.status === 409) {
                toast.info("Already in your collection");
                isInVocab = true;
                await invalidateAll();
                return;
            }
            if (!response.ok) {
                const errJson = (await response.json().catch(() => null)) as {
                    error?: string;
                } | null;
                throw new Error(errJson?.error ?? "Failed to save word");
            }
            await invalidateAll();
            toast.success("Saved to your collection");
            isInVocab = true;
            searchQuery = "";
        } catch (err) {
            console.error("Failed to save word", err);
            toast.error(
                err instanceof Error ? err.message : "Failed to save word. Try again.",
            );
        } finally {
            isSavingWord = false;
        }
    }

    function closeRecentSheet() {
        selectedRecent = null;
    }

    function onGlobalKeydown(e: KeyboardEvent) {
        if (e.key === "Escape" && selectedRecent) {
            closeRecentSheet();
        }
    }
</script>

<svelte:window onkeydown={onGlobalKeydown} />

<div
    class="min-h-full bg-[var(--surface-0)] text-gray-100 font-sans selection:bg-brand-darker/40 selection:text-white"
>
    <main class="mx-auto max-w-xl px-4 pt-4 pb-2 md:pt-6">
        <h1 class="text-[1.375rem] md:text-[1.5rem] font-semibold tracking-tight text-white">
            Lookup
        </h1>

        <form class="mt-3" onsubmit={handleSearch}>
            <label class="sr-only" for="word-search">Search for a word</label>
            <div
                class="flex items-center rounded-2xl border border-white/[0.08] bg-[var(--surface-1)] px-3 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-[border-color,box-shadow] duration-200 focus-within:border-brand/45 focus-within:ring-1 focus-within:ring-brand/35"
            >
                <Search
                    size={18}
                    class="shrink-0 text-gray-500"
                    strokeWidth={2}
                    aria-hidden="true"
                />
                <input
                    id="word-search"
                    name="q"
                    type="search"
                    autocomplete="off"
                    autocorrect="off"
                    spellcheck={false}
                    enterkeyhint="search"
                    bind:value={searchQuery}
                    bind:this={searchInput}
                    placeholder="Type a word…"
                    class="min-h-12 flex-1 bg-transparent px-2.5 py-3 text-[15px] text-gray-100 placeholder:text-gray-600 outline-none"
                />
                {#if isLoading}
                    <Loader
                        size={20}
                        class="shrink-0 animate-spin text-brand"
                        aria-label="Searching"
                    />
                {/if}
            </div>
        </form>

        {#if recentSearches.length > 0}
            <div class="mt-3 flex flex-wrap gap-2">
                {#each recentSearches as term}
                    <button
                        type="button"
                        onclick={() => applyChip(term)}
                        class="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-gray-300 transition-colors hover:border-brand/25 hover:bg-brand/10 hover:text-white active:scale-[0.98] touch-manipulation"
                    >
                        {term}
                    </button>
                {/each}
            </div>
        {/if}

        <div class="relative mt-5">
            {#if error}
                <div
                    class="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-3 text-[14px] text-red-300"
                    role="alert"
                >
                    <CircleAlert size={18} class="mt-0.5 shrink-0" strokeWidth={2} />
                    <p class="flex-1 pr-8 leading-snug">{error}</p>
                </div>
                <button
                    type="button"
                    onclick={() => (error = "")}
                    class="absolute top-2.5 right-2.5 rounded-lg p-1.5 text-red-300/90 transition hover:bg-red-500/10 hover:text-red-200"
                    aria-label="Dismiss error"
                >
                    <X size={16} strokeWidth={2} />
                </button>
            {/if}

            {#if searchResult && !error}
                <div
                    class="relative rounded-2xl border border-white/[0.08] bg-[var(--surface-1)] p-4 md:p-5"
                >
                    <button
                        type="button"
                        onclick={() => (searchResult = null)}
                        class="absolute top-3 right-3 rounded-lg p-1.5 text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-200"
                        aria-label="Close result"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>

                    <div
                        class="mb-4 flex flex-col gap-3 pr-10 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <h2 class="text-xl font-semibold capitalize tracking-tight text-white md:text-[1.375rem]">
                            {searchResult.word}
                        </h2>

                        {#if isInVocab}
                            <div
                                class="flex w-fit items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[13px] font-medium text-emerald-300"
                            >
                                <BookOpen size={15} strokeWidth={2} aria-hidden="true" />
                                In collection
                            </div>
                        {:else}
                            <button
                                type="button"
                                onclick={() => void saveWordToCollection()}
                                disabled={isSavingWord}
                                class="flex w-fit items-center gap-2 rounded-xl bg-brand-deep px-3 py-2 text-[14px] font-semibold text-white transition hover:bg-brand active:scale-[0.98] touch-manipulation disabled:opacity-60 disabled:active:scale-100"
                            >
                                {#if isSavingWord}
                                    <Loader size={17} class="animate-spin" aria-hidden="true" />
                                    Saving…
                                {:else}
                                    <Plus size={17} strokeWidth={2.25} aria-hidden="true" />
                                    Add word
                                {/if}
                            </button>
                        {/if}
                    </div>

                    <div class="space-y-5">
                        {#each searchResult.allMeanings as meaning}
                            <div>
                                <div class="mb-2">
                                    <span
                                        class="inline-block rounded-md border border-brand/20 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand"
                                    >
                                        {meaning.pos}
                                    </span>
                                </div>

                                <ul class="space-y-2">
                                    {#each meaning.definitions as def, i}
                                        <li class="flex gap-2.5">
                                            <span class="mt-0.5 font-mono text-[12px] text-gray-600"
                                                >{i + 1}.</span
                                            >
                                            <p class="text-[14px] leading-relaxed text-gray-300">
                                                {def}
                                            </p>
                                        </li>
                                    {/each}
                                </ul>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <section class="mt-8 md:mt-9">
            <h2 class="text-[1.125rem] font-semibold tracking-tight text-white">
                Recently added
            </h2>

            {#if data.recentWords && data.recentWords.length > 0}
                <ul class="mt-3 space-y-2">
                    {#each data.recentWords as item}
                        <li>
                            <RecentWordRow
                                word={item.word}
                                date={item.createdAt}
                                onclick={() => (selectedRecent = item)}
                            />
                        </li>
                    {/each}
                </ul>
            {:else}
                <p
                    class="mt-3 rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-[14px] text-gray-500"
                >
                    No words yet. Look up a term above to start your collection.
                </p>
            {/if}
        </section>
    </main>
</div>

{#if selectedRecent}
    <div class="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="recent-sheet-title">
        <button
            type="button"
            class="animate-backdrop-in absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onclick={closeRecentSheet}
            aria-label="Close details"
        ></button>

        <div
            class="animate-sheet-enter relative max-h-[min(88dvh,560px)] overflow-y-auto rounded-t-2xl border-t border-white/[0.08] bg-[var(--surface-1)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
        >
            <div class="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-white/15" aria-hidden="true"></div>

            <div class="flex items-start justify-between gap-3 pb-3">
                <h3
                    id="recent-sheet-title"
                    class="text-[1.375rem] font-semibold capitalize tracking-tight text-white"
                >
                    {selectedRecent.word}
                </h3>
                <button
                    type="button"
                    onclick={closeRecentSheet}
                    class="rounded-lg p-2 text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-200"
                    aria-label="Close"
                >
                    <X size={20} strokeWidth={2} />
                </button>
            </div>

            <p class="pb-4 text-[12px] text-gray-500">
                {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                }).format(new Date(selectedRecent.createdAt))}
            </p>

            <div class="space-y-4 pb-4">
                {#each selectedRecent.meanings as meaning}
                    <div class="rounded-xl border border-white/[0.06] bg-[var(--surface-2)] p-4">
                        <span
                            class="inline-block rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400"
                        >
                            {meaning.type}
                        </span>

                        {#if meaning.dictionaryMeaning}
                            <div class="mt-3">
                                <h4 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Meaning
                                </h4>
                                <p class="mt-1.5 text-[14px] leading-relaxed text-gray-200">
                                    {meaning.dictionaryMeaning}
                                </p>
                            </div>
                        {/if}

                        {#if meaning.personalMeaning}
                            {@const note = splitPersonalNote(meaning.personalMeaning)}
                            {#if note.body}
                                <div class="mt-3">
                                    <h4 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Your meaning
                                    </h4>
                                    <p class="mt-1.5 text-[14px] leading-relaxed text-gray-200">
                                        {note.body}
                                    </p>
                                </div>
                            {/if}
                            {#if note.mnemonic}
                                <div class="mt-3">
                                    <h4 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Your note / mnemonic
                                    </h4>
                                    <p class="mt-1.5 text-[14px] leading-relaxed text-gray-200">
                                        {note.mnemonic}
                                    </p>
                                </div>
                            {/if}
                        {/if}

                        {#if meaning.examples?.length}
                            <div class="mt-3">
                                <h4 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Examples
                                </h4>
                                <ul class="mt-2 space-y-2">
                                    {#each meaning.examples as ex}
                                        <li class="border-l-2 border-white/10 pl-3 text-[13px] italic text-gray-300">
                                            {#if ex.dictionaryExample}
                                                <p>{ex.dictionaryExample}</p>
                                            {/if}
                                            {#if ex.personalExample}
                                                <p class="mt-1 not-italic text-gray-500">
                                                    {ex.personalExample}
                                                </p>
                                            {/if}
                                        </li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}
