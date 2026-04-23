<script lang="ts">
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
    import AddWordModal from "$lib/components/AddWordModal.svelte";
    import RecentWordCard from "$lib/components/RecentWordCard.svelte";
    import { invalidateAll } from "$app/navigation";
    import { toast } from "svelte-sonner";

    let isModalOpen = $state(false);
    let searchQuery = $state("");
    let { data } = $props();

    // UI State Management
    let isLoading = $state(false);
    let error = $state("");
    let searchResult = $state<SearchResult>(null);
    let isInVocab = $state(false); // Tracks if the word is already in your database

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        // Reset states
        isLoading = true;
        error = "";
        searchResult = null;
        isInVocab = false;

        try {
            const wordToSearch = searchQuery.trim().toLowerCase();

            // Search for the word in database
            const wordSearchResponse = await fetch(
                `/api/search?word=${wordToSearch}`,
            );
            const wordSearchData =
                (await wordSearchResponse.json()) as SearchWordResponse;
            if (wordSearchData.status === "failed") {
                throw new Error(
                    wordSearchData.message || "An unknown error occurred.",
                );
            }

            // If the word is in the database, set the search result to the data
            if (wordSearchData.data !== null) {
                searchResult = wordSearchData.data;
                isInVocab = true;
                isLoading = false;
                searchQuery = ""; // Clear the search query
                return;
            }

            // 2. DICTIONARY API CALL (If not in DB)
            const response = await fetch(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${wordToSearch}`,
            );

            if (!response.ok) {
                // 404 means the word wasn't found in the dictionary
                throw new Error(
                    "Word not found in the dictionary. Please check your spelling.",
                );
            }

            const data = (await response.json()) as DictEntry[];
            const entry = data[0];

            searchResult = {
                word: entry.word,
                allMeanings: entry.meanings.map((m) => ({
                    pos: m.partOfSpeech,
                    definitions: m.definitions
                        .slice(0, 2)
                        .map((d) => d.definition),
                })),
            };
            isInVocab = false; // Word is valid but not in our DB yet
        } catch (err: any) {
            error = err.message || "An unexpected error occurred.";
            console.error("Search Error:", err);
            toast.error("Failed to search for word. Please try again");
        } finally {
            isLoading = false;
        }
    };

    const handleFinalConfirm = async (payload: AddWordPayload) => {
        try {
            // 1. Send the data to your Prisma backend to save
            const response = await fetch("/api/words", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                // It tells SvelteKit to refresh the 'data' prop from the server, so the new word is displayed
                await invalidateAll();
                toast.success("Word saved successfully! 🎉");

                // 3. Close the modal and show success
                isModalOpen = false;
                isInVocab = true;
                searchQuery = ""; // Clear the search query
            } else {
                throw new Error("Failed to save word");
            }
        } catch (err) {
            console.error("Failed to save word", err);
            toast.error("Failed to save word. Please try again");
        }
    };

    // Open the modal to add the word to the database
    const addToVocabulary = () => {
        isModalOpen = true;
    };
</script>

<div
    class="min-h-screen bg-[#0d1120] text-gray-100 font-sans selection:bg-brand-darker/50 selection:text-white"
>
    <main class="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <div class="flex flex-col items-center text-center mb-16">
            <h1 class="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                Look up a word
            </h1>
            <p class="text-gray-400 text-lg mb-8">
                Search for any English word to see its meaning or add it to your
                collection
            </p>

            <div
                class="w-full max-w-2xl flex items-center bg-[#151b30] border border-gray-700/60 rounded-xl overflow-hidden focus-within:border-brand/50 transition-colors shadow-lg shadow-black/20"
            >
                <div class="pl-4 text-gray-400">
                    <Search size={20} />
                </div>
                <input
                    type="text"
                    bind:value={searchQuery}
                    onkeydown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search for a word (e.g., ephemeral, code...)"
                    class="flex-1 bg-transparent border-none outline-none px-4 py-4 text-gray-200 placeholder-gray-500 w-full"
                />
                <button
                    class="bg-brand-deep hover:bg-brand-darker text-white px-8 py-4 font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                    onclick={handleSearch}
                    disabled={searchQuery.trim() === "" || isLoading}
                >
                    {#if isLoading}
                        <Loader size={20} class="animate-spin" />
                    {:else}
                        Search
                    {/if}
                </button>
            </div>
        </div>

        <div class="relative max-w-2xl mx-auto mb-16">
            {#if error}
                <div
                    class="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3"
                >
                    <CircleAlert size={20} class="mt-0.5 shrink-0" />
                    <p>{error}</p>
                </div>
                <button
                    onclick={() => (error = "")}
                    class="absolute top-3 right-3 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/40 rounded-full p-1.5 transition-colors bg-[#151b30]"
                >
                    <X size={16} />
                </button>
            {/if}

            {#if searchResult && !error}
                <div
                    class="relative bg-[#151b30] border border-brand/30 rounded-xl p-6 md:p-8 shadow-lg shadow-black/20"
                >
                    <!-- Close Button -->
                    <button
                        onclick={() => (searchResult = null)}
                        class="absolute top-4 right-4 text-gray-400 hover:text-gray-200 border border-gray-800 hover:border-gray-600 rounded-full p-2 transition-colors bg-[#12182b]"
                    >
                        <X size={18} />
                    </button>

                    <!-- Header -->
                    <div
                        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pr-10"
                    >
                        <!-- Word -->
                        <h2
                            class="text-3xl sm:text-4xl font-bold text-gray-100"
                        >
                            {searchResult.word}
                        </h2>

                        <!-- Status / Add Button -->
                        {#if isInVocab}
                            <div
                                class="flex items-center w-fit text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg border border-green-400/20"
                            >
                                <BookOpen size={16} class="mr-2" />
                                <span class="text-sm font-medium"
                                    >In Vocabulary</span
                                >
                            </div>
                        {:else}
                            <button
                                onclick={addToVocabulary}
                                class="flex items-center w-fit bg-brand-deep hover:bg-brand text-white px-4 py-2 rounded-lg font-semibold transition-all hover:scale-[1.03] active:scale-95 shadow-md shadow-brand/25"
                            >
                                <Plus size={18} class="mr-2" />
                                Add Word
                            </button>
                        {/if}
                    </div>

                    <!-- Meanings -->
                    <div class="space-y-8">
                        {#each searchResult.allMeanings as meaning}
                            <div>
                                <!-- POS header -->
                                <div class="flex items-center gap-3 mb-3">
                                    <span
                                        class="bg-brand/10 text-brand text-xs px-3 py-1 rounded-md font-semibold uppercase tracking-wide border border-brand/20"
                                    >
                                        {meaning.pos}
                                    </span>
                                    <div class="h-px flex-1 bg-gray-800"></div>
                                </div>

                                <!-- Definitions -->
                                <ul class="space-y-3">
                                    {#each meaning.definitions as def, i}
                                        <li class="flex gap-3">
                                            <span
                                                class="text-gray-600 font-mono text-sm mt-1"
                                                >{i + 1}.</span
                                            >
                                            <p
                                                class="text-gray-300 text-base leading-relaxed"
                                            >
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

        <AddWordModal
            bind:show={isModalOpen}
            data={searchResult}
            onConfirm={handleFinalConfirm}
        />

        <section class="mt-20">
            <div class="flex items-center justify-between mb-8">
                <h2 class="text-2xl font-bold text-gray-100">Recently Added</h2>
                <div class="h-[1px] flex-1 bg-gray-800 ml-6"></div>
            </div>

            {#if data.recentWords && data.recentWords.length > 0}
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {#each data.recentWords as item}
                        <RecentWordCard
                            word={item.word}
                            meaning={item.meanings[0]?.dictionaryMeaning ||
                                "No definition added."}
                            date={item.createdAt}
                        />
                    {/each}
                </div>
            {:else}
                <div
                    class="py-20 text-center border-2 border-dashed border-gray-800 rounded-3xl"
                >
                    <p class="text-gray-500">
                        Your vocabulary is empty. Search for a word to get
                        started!
                    </p>
                </div>
            {/if}
        </section>
    </main>
</div>
