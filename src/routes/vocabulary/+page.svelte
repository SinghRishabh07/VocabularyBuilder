<script lang="ts">
    import {
        Search,
        Heart,
        Trash2,
        X,
        SlidersHorizontal,
        Check,
    } from "@lucide/svelte";
    import { invalidateAll } from "$app/navigation";
    import type { VocabularyWord } from "$lib/types";
    import { toast } from "svelte-sonner";
    import DeleteModal from "$lib/components/DeleteModal.svelte";

    let { data } = $props<{ data: { data: VocabularyWord[] } }>();
    let words = $state<VocabularyWord[]>([]);

    $effect(() => {
        words = data?.data ?? [];
    });

    // --- STATE --- Crearting reactive state variable to reflect in the UI when changing the filter
    let searchQuery = $state("");
    let selectedLetter = $state("All");
    let showFavoritesOnly = $state(false);
    let selectedWord = $state<any>(null); // For the modal
    let deleteModalOpen = $state(false);
    let wordDetailModalOpen = $state(false);
    let open = $state(false); // For the filter dropdown
    const options = [
        { label: "A → Z", value: "az" },
        { label: "Z → A", value: "za" },
        { label: "Newest first", value: "new" },
        { label: "Oldest first", value: "old" },
    ];

    let selected = $state<{ label: string; value: string }>(options[2]);

    function select(option: { label: string; value: string }) {
        selected = option;
        open = false;
    }

    const alphabet = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

    let filteredWords = $derived.by(() => {
        let result = words?.filter((w: VocabularyWord) => {
            const matchesSearch = w.word
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesLetter =
                selectedLetter === "All" ||
                w.word.toLowerCase().startsWith(selectedLetter.toLowerCase());
            const matchesFavorite = showFavoritesOnly ? w.isFavorite : true;
            return matchesSearch && matchesLetter && matchesFavorite;
        });
        return result.sort((a, b) => handleFilterChange(selected.value, a, b));
    });

    // --- FUNCTIONS --- Filter the words based on the selected option
    function handleFilterChange(
        sortValue: string,
        a: VocabularyWord,
        b: VocabularyWord,
    ) {
        if (sortValue === "new") {
            return b.createdAt.getTime() - a.createdAt.getTime();
        } else if (sortValue === "old") {
            return a.createdAt.getTime() - b.createdAt.getTime();
        } else if (sortValue === "az") {
            return a.word.toLowerCase().localeCompare(b.word.toLowerCase());
        } else if (sortValue === "za") {
            return b.word.toLowerCase().localeCompare(a.word.toLowerCase());
        }

        return 0;
    }

    // --- FUNCTIONS --- Toggle the favorite status of a word
    const toggleFavorite = async (e: Event, id: string) => {
        e.stopPropagation();
        const word = words.find((w) => w.id === id);
        if (!word) return;
        const nextFavorite = !word.isFavorite;
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
            if (nextFavorite) {
                toast.success("Word marked as favorite! 💖");
            } else {
                toast.success("Word removed from favorites. 💔");
            }
            await invalidateAll();
        } catch (err) {
            console.error("Failed to mark as favorite. Please try again.", err);
            toast.error("Failed to mark as favorite. Please try again.");
        }
    };

    const handleWordDetailModalOpen = (e: Event, item: VocabularyWord) => {
        e.stopPropagation();
        selectedWord = item;
        wordDetailModalOpen = true;
    };

    const handleDeleteModalOpen = (e: Event, item: VocabularyWord) => {
        e.stopPropagation();
        selectedWord = item;
        deleteModalOpen = true;
    };
</script>

<svelte:window onclick={() => {
    console.log("Close modal from window");
    open = false;
    wordDetailModalOpen = false;
    deleteModalOpen = false;
    selectedWord = null;
}} />

<div
    class="min-h-screen bg-[#0a0e17] text-gray-100 font-sans p-8 selection:bg-blue-900"
>
    <div class="max-w-6xl mx-auto">
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-white mb-1">My Vocabulary</h1>
            <p class="text-gray-400 text-sm">{filteredWords.length} words</p>
        </div>

        <!-- Search and filter -->
        <div class="flex flex-col md:flex-row gap-4 mb-6">
            <div class="flex-1 relative">
                <Search
                    size={18}
                    class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search words..."
                    class="w-full bg-[#12182b] border border-gray-800 rounded-lg pl-11 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                />
            </div>

            <div class="flex gap-3">
                <button
                    class="flex items-center gap-2 bg-[#12182b] border border-gray-800 hover:border-gray-600 rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer"
                    onclick={(e) => {
                        e.stopPropagation();
                        open = !open;
                    }}
                >
                    <SlidersHorizontal size={16} class="text-gray-400" />
                    <span>{selected.label}</span>
                </button>

                {#if open}
                    <!-- Dropdown -->
                    <div
                        class="absolute mt-2 w-44 bg-[#0f1423] border border-gray-800 rounded-lg shadow-lg overflow-hidden z-50"
                    >
                        {#each options as option}
                            <button
                                class="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-300 hover:bg-[#12182b]"
                                onclick={() => select(option)}
                            >
                                <span>{option.label}</span>

                                {#if selected.value === option.value}
                                    <Check size={16} class="text-gray-400" />
                                {/if}
                            </button>
                        {/each}
                    </div>
                {/if}
                <button
                    onclick={() => (showFavoritesOnly = !showFavoritesOnly)}
                    class="flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer {showFavoritesOnly
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-[#12182b] border-gray-800 hover:border-gray-600'}"
                >
                    <Heart
                        size={16}
                        class={showFavoritesOnly ? "fill-current" : ""}
                    />
                    <span>Favorites</span>
                </button>
            </div>
        </div>

        <!-- Alphabet filter -->
        <div class="flex flex-wrap gap-2 mb-10">
            {#each alphabet as letter}
                <button
                    onclick={() => (selectedLetter = letter)}
                    class="px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer {selectedLetter ===
                    letter
                        ? 'bg-[#3b82f6] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'}"
                >
                    {letter}
                </button>
            {/each}
        </div>

        <!-- Word list -->
        <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            {#each filteredWords ?? [] as item}
                <div
                    onclick={(e) => handleWordDetailModalOpen(e, item)}
                    class="bg-[#12182b] border border-transparent hover:border-gray-700 rounded-xl p-5 relative group cursor-pointer transition-all duration-200 h-28 flex flex-col justify-between shadow-sm"
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            wordDetailModalOpen = true;
                            selectedWord = item;
                        }
                    }}
                >
                    <div
                        class="absolute top-4 right-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                        <button
                            onclick={(e) => toggleFavorite(e, item.id)}
                            class="text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                            <Heart
                                size={18}
                                class={item.isFavorite
                                    ? "fill-rose-500 text-rose-500"
                                    : ""}
                            />
                        </button>
                        <button
                            onclick={(e) => handleDeleteModalOpen(e, item)}
                            class="text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                    <!-- Show the word and the date the word was added to the vocabulary -->
                    <div>
                        <!-- Show the word -->
                        <h3 class="text-lg font-bold text-gray-100">
                            {item.word}
                        </h3>
                        <!-- Show the date the word was added to the vocabulary -->
                        <p class="text-gray-500 text-xs mt-1">
                            {item.createdAt.toLocaleDateString()}
                        </p>
                    </div>

                    <!-- If item is marked favourite show the heart icon -->
                    <div>
                        {#if item.isFavorite}
                            <Heart
                                size={14}
                                class="fill-rose-500 text-rose-500"
                            />
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        {#if filteredWords?.length === 0}
            <div class="text-center py-20 text-gray-500">
                <p>No words found matching your filters.</p>
            </div>
        {/if}
    </div>
</div>

<!-- Delete modal -->
<DeleteModal bind:open={deleteModalOpen} bind:word={selectedWord} />

<!-- Word detail modal -->
{#if wordDetailModalOpen}
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onclick={() => (selectedWord = null)}
        role="button"
        tabindex="0"
        onkeydown={(e) =>
            (e.key === "Enter" || e.key === " ") && (selectedWord = null)}
    >
        <div
            class="bg-[#0f1423] border border-gray-800 rounded-2xl p-8 max-w-lg w-full relative shadow-2xl"
            onclick={(e) => e.stopPropagation()}
            role="button"
            tabindex="0"
            onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    wordDetailModalOpen = false;
                    selectedWord = null;
                }
            }}
        >
            <div    
                onclick={(e) => {
                    e.stopPropagation();
                    console.log("Close modal");
                    wordDetailModalOpen = false;
                    selectedWord = null;
                }}
                class="absolute top-6 right-6 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-full p-1 transition-colors cursor-pointer"
                role="button"
                tabindex="0"
                onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        wordDetailModalOpen = false;
                        selectedWord = null;
                    }
                }}
            >
                <X size={20} />
            </div>

            <div class="flex items-center gap-3 mb-8">
                <h2 class="text-3xl font-bold text-white">
                    {selectedWord?.word ?? ""}
                </h2>
            </div>

            <div class="space-y-8">
                {#each selectedWord?.meanings ?? [] as meaning}
                    <div
                        class="border border-gray-800 rounded-xl p-6 bg-[#0f1423]/40"
                    >
                        <!-- Meaning Type -->
                        <div class="flex items-center justify-between mb-4">
                            <span
                                class="bg-[#1e293b] text-gray-300 text-xs px-3 py-1 rounded-full font-medium"
                            >
                                {meaning.type}
                            </span>
                        </div>

                        <div class="space-y-5">
                            {#if meaning.dictionaryMeaning}
                                <div>
                                    <h4
                                        class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2"
                                    >
                                        Dictionary Meaning
                                    </h4>
                                    <p class="text-gray-200 leading-relaxed">
                                        {meaning.dictionaryMeaning}
                                    </p>
                                </div>
                            {/if}

                            {#if meaning.personalMeaning}
                                <div>
                                    <h4
                                        class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2"
                                    >
                                        Personal Meaning
                                    </h4>
                                    <p class="text-gray-200 leading-relaxed">
                                        {meaning.personalMeaning}
                                    </p>
                                </div>
                            {/if}

                            {#if meaning.examples?.length}
                                <div>
                                    <h4
                                        class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3"
                                    >
                                        Examples
                                    </h4>

                                    <div class="space-y-3">
                                        {#each meaning.examples as example}
                                            <div
                                                class="border-l-2 border-gray-700 pl-4 text-gray-300 italic"
                                            >
                                                {#if example.dictionaryExample}
                                                    <p>
                                                        {example.dictionaryExample}
                                                    </p>
                                                {/if}

                                                {#if example.personalExample}
                                                    <p
                                                        class="text-gray-400 mt-1"
                                                    >
                                                        {example.personalExample}
                                                    </p>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}
