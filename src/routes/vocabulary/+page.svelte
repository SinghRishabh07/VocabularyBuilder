<script lang="ts">
    import {
        Search,
        Heart,
        Trash2,
        X,
        Pencil,
        ChevronRight,
    } from "@lucide/svelte";
    import { invalidateAll } from "$app/navigation";
    import type { VocabularyWord } from "$lib/types";
    import { toast } from "svelte-sonner";
    import DeleteModal from "$lib/components/DeleteModal.svelte";
    import EditWordModal from "$lib/components/EditWordModal.svelte";
    import { splitPersonalNote } from "$lib/personalNoteSplit";

    let { data } = $props<{ data: { data: VocabularyWord[] } }>();
    let words = $state<VocabularyWord[]>([]);

    $effect(() => {
        words = data?.data ?? [];
    });

    let searchQuery = $state("");
    let selectedLetter = $state("All");
    let showFavoritesOnly = $state(false);
    let selectedWord = $state<VocabularyWord | null>(null);
    let wordToEdit = $state<VocabularyWord | null>(null);
    let deleteModalOpen = $state(false);
    let wordDetailOpen = $state(false);
    let editModalOpen = $state(false);

    const sortOptions = [
        { label: "Newest", value: "new" },
        { label: "Oldest", value: "old" },
        { label: "A–Z", value: "az" },
        { label: "Z–A", value: "za" },
    ] as const;

    let sortValue = $state<(typeof sortOptions)[number]["value"]>("new");

    const alphabet = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

    let filteredWords = $derived.by(() => {
        const result = words?.filter((w: VocabularyWord) => {
            const matchesSearch = w.word
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesLetter =
                selectedLetter === "All" ||
                w.word.toLowerCase().startsWith(selectedLetter.toLowerCase());
            const matchesFavorite = showFavoritesOnly ? w.isFavorite : true;
            return matchesSearch && matchesLetter && matchesFavorite;
        });
        return result.sort((a, b) => sortCompare(sortValue, a, b));
    });

    function sortCompare(
        sortVal: string,
        a: VocabularyWord,
        b: VocabularyWord,
    ) {
        if (sortVal === "new") {
            return b.createdAt.getTime() - a.createdAt.getTime();
        }
        if (sortVal === "old") {
            return a.createdAt.getTime() - b.createdAt.getTime();
        }
        if (sortVal === "az") {
            return a.word.toLowerCase().localeCompare(b.word.toLowerCase());
        }
        if (sortVal === "za") {
            return b.word.toLowerCase().localeCompare(a.word.toLowerCase());
        }
        return 0;
    }

    function formatRowDate(d: Date) {
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(d);
    }

    function openDetail(e: Event, item: VocabularyWord) {
        e.stopPropagation();
        selectedWord = item;
        wordDetailOpen = true;
    }

    function closeDetail() {
        wordDetailOpen = false;
        selectedWord = null;
    }

    const toggleFavorite = async (e: Event | undefined, id: string) => {
        e?.stopPropagation();
        const entry = words.find((w) => w.id === id);
        if (!entry) return;
        const nextFavorite = !entry.isFavorite;
        words = words.map((w) =>
            w.id === id ? { ...w, isFavorite: nextFavorite } : w,
        );
        try {
            const res = await fetch(`/api/words/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isFavorite: nextFavorite }),
            });
            if (!res.ok) throw new Error("Failed to update");
            if (selectedWord?.id === id) {
                selectedWord = { ...selectedWord, isFavorite: nextFavorite };
            }
            if (nextFavorite) {
                toast.success("Saved to favorites");
            } else {
                toast.success("Removed from favorites");
            }
            await invalidateAll();
        } catch (err) {
            console.error(err);
            toast.error("Could not update favorite");
            words = words.map((w) =>
                w.id === id ? { ...w, isFavorite: entry.isFavorite } : w,
            );
        }
    };

    function handleEditOpen(e: Event, item: VocabularyWord) {
        e.stopPropagation();
        wordDetailOpen = false;
        wordToEdit = item;
        selectedWord = null;
        editModalOpen = true;
    }

    function handleDeleteModalOpen(e: Event, item: VocabularyWord) {
        e.stopPropagation();
        selectedWord = item;
        deleteModalOpen = true;
    }

    function openDeleteFromSheet(e: Event) {
        e.stopPropagation();
        if (!selectedWord) return;
        deleteModalOpen = true;
        wordDetailOpen = false;
    }

    function chipClass(active: boolean) {
        return active
            ? "border-brand/40 bg-brand/12 text-brand"
            : "border-white/[0.08] bg-white/[0.04] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300";
    }

    function onSearchSubmit(ev: Event) {
        ev.preventDefault();
        (ev.target as HTMLFormElement).querySelector("input")?.blur();
    }

    function onGlobalKeydown(e: KeyboardEvent) {
        if (e.key !== "Escape") return;
        if (editModalOpen) return;
        if (deleteModalOpen) return;
        if (wordDetailOpen) closeDetail();
    }
</script>

<svelte:window onkeydown={onGlobalKeydown} />

<div
    class="min-h-full bg-[var(--surface-0)] font-sans text-gray-100 selection:bg-brand-darker/40"
>
    <main
        class="mx-auto max-w-xl px-4 pt-3 pb-6 lg:max-w-4xl lg:px-6 lg:pt-5 lg:pb-10"
    >
        <div class="mb-3">
            <h1
                class="text-[1.375rem] font-semibold tracking-tight text-white sm:text-[1.625rem]"
            >
                My Vocabulary
            </h1>
            <p class="mt-0.5 text-[12px] leading-snug text-gray-500">
                {#if filteredWords.length !== words.length}
                    {filteredWords.length} matching · {words.length}
                    {words.length === 1 ? "word" : "words"} saved
                {:else}
                    {words.length}
                    {words.length === 1 ? "word" : "words"} saved
                {/if}
            </p>
        </div>

        <form class="mt-3" onsubmit={onSearchSubmit}>
            <label class="sr-only" for="vocab-search">Search vocabulary</label>
            <div
                class="flex items-center rounded-2xl border border-white/[0.08] bg-[var(--surface-1)] px-3 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-[border-color,box-shadow] duration-200 focus-within:border-brand/40 focus-within:ring-1 focus-within:ring-brand/25"
            >
                <Search
                    size={18}
                    class="shrink-0 text-gray-500"
                    strokeWidth={2}
                    aria-hidden="true"
                />
                <input
                    id="vocab-search"
                    type="search"
                    autocomplete="off"
                    autocorrect="off"
                    spellcheck={false}
                    enterkeyhint="search"
                    bind:value={searchQuery}
                    placeholder="Search…"
                    class="min-h-11 w-full flex-1 bg-transparent px-2.5 py-2.5 text-[15px] text-gray-100 outline-none placeholder:text-gray-600"
                />
            </div>
        </form>

        <!-- Sort + favorites chips -->
        <div
            class="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            {#each sortOptions as opt}
                <button
                    type="button"
                    onclick={() => (sortValue = opt.value)}
                    class="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 active:scale-[0.98] touch-manipulation {chipClass(
                        sortValue === opt.value,
                    )}"
                >
                    {opt.label}
                </button>
            {/each}
            <button
                type="button"
                onclick={() => (showFavoritesOnly = !showFavoritesOnly)}
                class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 active:scale-[0.98] touch-manipulation {chipClass(
                    showFavoritesOnly,
                )}"
            >
                <Heart
                    size={13}
                    strokeWidth={2}
                    class={showFavoritesOnly ? "fill-brand text-brand" : ""}
                    aria-hidden="true"
                />
                Favorites
            </button>
        </div>

        <!-- Alphabet: horizontal scroll -->
        <div
            class="mt-3 -mx-1 border-b border-white/[0.04] pb-2.5"
            aria-label="Filter by first letter"
        >
            <div
                class="flex gap-1 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {#each alphabet as letter}
                    <button
                        type="button"
                        onclick={() => (selectedLetter = letter)}
                        class="min-h-9 min-w-9 shrink-0 rounded-lg text-[13px] font-semibold transition-colors duration-150 active:scale-95 touch-manipulation {selectedLetter ===
                        letter
                            ? 'bg-brand text-white'
                            : 'text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'}"
                    >
                        {letter}
                    </button>
                {/each}
            </div>
        </div>

        <!-- List -->
        <ul class="mt-2 space-y-1.5" role="list">
            {#each filteredWords ?? [] as item (item.id)}
                <li>
                    <button
                        type="button"
                        onclick={(e) => openDetail(e, item)}
                        class="group flex w-full min-h-[3.25rem] items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.055] active:bg-white/[0.07] touch-manipulation"
                    >
                        <div class="min-w-0 flex-1">
                            <div
                                class="flex items-center gap-2"
                            >
                                <span
                                    class="truncate text-[15px] font-semibold capitalize tracking-tight text-gray-100"
                                    >{item.word}</span
                                >
                                {#if item.isFavorite}
                                    <Heart
                                        size={12}
                                        class="shrink-0 fill-brand text-brand"
                                        aria-label="Favorite"
                                    />
                                {/if}
                            </div>
                            <p class="mt-0.5 text-[12px] tabular-nums text-gray-500">
                                {formatRowDate(item.createdAt)}
                            </p>
                        </div>
                        <ChevronRight
                            size={18}
                            class="shrink-0 text-gray-600 transition group-hover:text-gray-500"
                            aria-hidden="true"
                        />
                    </button>
                </li>
            {/each}
        </ul>

        {#if filteredWords?.length === 0}
            <p
                class="mt-10 rounded-xl border border-dashed border-white/[0.08] px-4 py-10 text-center text-[14px] text-gray-500"
            >
                No words match. Try another search or filter.
            </p>
        {/if}
    </main>
</div>

<DeleteModal bind:open={deleteModalOpen} bind:word={selectedWord} />

<EditWordModal
    bind:open={editModalOpen}
    bind:word={wordToEdit}
    onSaved={async () => {
        await invalidateAll();
        toast.success("Changes saved");
    }}
/>

{#if wordDetailOpen && selectedWord}
    {@const sw = selectedWord}
    <div
        class="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vocab-detail-title"
    >
        <button
            type="button"
            class="animate-backdrop-in absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label="Close"
            onclick={closeDetail}
        ></button>

        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            role="document"
            tabindex="-1"
            class="animate-sheet-enter relative flex max-h-[min(88dvh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-white/[0.08] bg-[var(--surface-1)] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] sm:max-h-[min(85dvh,560px)] sm:rounded-2xl sm:shadow-2xl"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
        >
            <div class="mx-auto mt-2 mb-1 h-1 w-9 shrink-0 rounded-full bg-white/15 sm:hidden" aria-hidden="true"></div>

            <div
                class="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-4 pb-3 pt-1 sm:px-5 sm:pt-4"
            >
                <div class="min-w-0">
                    <h2
                        id="vocab-detail-title"
                        class="text-xl font-semibold capitalize tracking-tight text-white sm:text-[1.375rem]"
                    >
                        {sw.word}
                    </h2>
                    <p class="mt-0.5 text-[12px] text-gray-500">
                        Added {formatRowDate(sw.createdAt)}
                    </p>
                </div>
                <button
                    type="button"
                    onclick={closeDetail}
                    class="rounded-lg p-2 text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-200"
                    aria-label="Close"
                >
                    <X size={20} strokeWidth={2} />
                </button>
            </div>

            <!-- Quick actions -->
            <div
                class="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 sm:px-5"
            >
                <button
                    type="button"
                    onclick={(e) => void toggleFavorite(e, sw.id)}
                    class="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-2 text-[13px] font-medium text-gray-300 transition hover:border-brand/25 hover:bg-brand/10 hover:text-brand touch-manipulation"
                >
                    <Heart
                        size={16}
                        class={sw.isFavorite
                            ? "fill-brand text-brand"
                            : ""}
                    />
                    {sw.isFavorite ? "Favorited" : "Favorite"}
                </button>
                <button
                    type="button"
                    onclick={(e) => handleEditOpen(e, sw)}
                    class="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-2 text-[13px] font-medium text-gray-300 transition hover:border-brand/25 hover:bg-brand/10 hover:text-brand touch-manipulation"
                >
                    <Pencil size={16} strokeWidth={2} />
                    Edit
                </button>
                <button
                    type="button"
                    onclick={(e) => openDeleteFromSheet(e)}
                    class="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-2 text-[13px] font-medium text-red-300/90 transition hover:bg-red-500/10 touch-manipulation"
                >
                    <Trash2 size={16} strokeWidth={2} />
                    Delete
                </button>
            </div>

            <div
                class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:pb-5"
            >
                <div class="space-y-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    {#each sw.meanings as meaning}
                        <div
                            class="rounded-xl border border-white/[0.06] bg-[var(--surface-2)] p-4"
                        >
                            <span
                                class="inline-block rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400"
                            >
                                {meaning.type}
                            </span>

                            {#if meaning.dictionaryMeaning}
                                <div class="mt-3">
                                    <h3
                                        class="text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                                    >
                                        Meaning
                                    </h3>
                                    <p class="mt-1.5 text-[14px] leading-relaxed text-gray-200">
                                        {meaning.dictionaryMeaning}
                                    </p>
                                </div>
                            {/if}

                            {#if meaning.personalMeaning}
                                {@const note = splitPersonalNote(
                                    meaning.personalMeaning,
                                )}
                                {#if note.body}
                                    <div class="mt-3">
                                        <h3
                                            class="text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                                        >
                                            Your meaning
                                        </h3>
                                        <p class="mt-1.5 text-[14px] leading-relaxed text-gray-200">
                                            {note.body}
                                        </p>
                                    </div>
                                {/if}
                                {#if note.mnemonic}
                                    <div class="mt-3">
                                        <h3
                                            class="text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                                        >
                                            Your note / mnemonic
                                        </h3>
                                        <p class="mt-1.5 text-[14px] leading-relaxed text-gray-200">
                                            {note.mnemonic}
                                        </p>
                                    </div>
                                {/if}
                            {/if}

                            {#if meaning.examples?.length}
                                <div class="mt-3">
                                    <h3
                                        class="text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                                    >
                                        Examples
                                    </h3>
                                    <ul class="mt-2 space-y-2">
                                        {#each meaning.examples as example}
                                            <li
                                                class="border-l-2 border-white/15 pl-3 text-[13px] text-gray-300"
                                            >
                                                {#if example.dictionaryExample}
                                                    <p class="italic">
                                                        {example.dictionaryExample}
                                                    </p>
                                                {/if}
                                                {#if example.personalExample}
                                                    <p class="mt-1 not-italic text-gray-500">
                                                        {example.personalExample}
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
    </div>
{/if}
