<script>
    // Import icons from lucide-svelte
    import {
        Search,
        Calendar,
        Loader,
        CircleAlert,
        Plus,
        BookOpen
    } from "@lucide/svelte";

    let searchQuery = "";
    
    // UI State Management
    let isLoading = false;
    let error = "";
    let searchResult = {};
    let isInVocab = false; // Tracks if the word is already in your database

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        console.log("Search button clicked", searchQuery);
        
        // Reset states
        isLoading = true;
        error = "";
        searchResult = {};
        isInVocab = false;

        try {
            const wordToSearch = searchQuery.toLowerCase().trim();

            // 1. MOCK DB CHECK (Replace this with a real fetch to your SvelteKit backend)
            // Simulating that "ephemeral" is already in your database
            if (wordToSearch === "ephemeral") {
                searchResult = {
                    word: "ephemeral",
                    pos: "adjective",
                    def: "Lasting for a very short time."
                };
                isInVocab = true;
                isLoading = false;
                return;
            }

            // 2. DICTIONARY API CALL (If not in DB)
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToSearch}`);
            
            if (!response.ok) {
                // 404 means the word wasn't found in the dictionary
                throw new Error("Word not found in the dictionary. Please check your spelling.");
            }

            const data = await response.json();
            
            // Extract the first meaning from the API response
            const firstMeaning = data[0].meanings[0];
            
            searchResult = {
                word: data[0].word,
                pos: firstMeaning.partOfSpeech,
                def: firstMeaning.definitions[0].definition
            };
            isInVocab = false; // Word is valid but not in our DB yet

        } catch (err) {
            // error = err.message;
        } finally {
            isLoading = false;
        }
    };

    const addToVocabulary = () => {
        console.log("Saving to database:", searchResult);
        // Here you will make a POST request to your backend to save via Prisma
        isInVocab = true; // Optimistic UI update
    };

    // Mock data for the "Recently Added" section
    const recentWords = [
        { word: "ephemeral", pos: "adjective", def: "Lasting for a very short time.", date: "Mar 1" },
        // ... (rest of your mock data)
    ];
</script>

<div class="min-h-screen bg-[#0d1120] text-gray-100 font-sans selection:bg-rose-900 selection:text-white">
    <main class="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <div class="flex flex-col items-center text-center mb-16">
            <h1 class="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Look up a word</h1>
            <p class="text-gray-400 text-lg mb-8">Search for any English word to see its meaning or add it to your collection</p>

            <div class="w-full max-w-2xl flex items-center bg-[#151b30] border border-gray-700/60 rounded-xl overflow-hidden focus-within:border-rose-500/50 transition-colors shadow-lg shadow-black/20">
                <div class="pl-4 text-gray-400">
                    <Search size={20} />
                </div>
                <input
                    type="text"
                    bind:value={searchQuery}
                    onkeydown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search for a word (e.g., ephemeral, code...)"
                    class="flex-1 bg-transparent border-none outline-none px-4 py-4 text-gray-200 placeholder-gray-500 w-full"
                />
                <button
                    class="bg-[#94364e] hover:bg-[#7a2c40] text-white px-8 py-4 font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
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

        <div class="max-w-2xl mx-auto mb-16">
            {#if error}
                <div class="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3">
                    <CircleAlert size={20} class="mt-0.5 shrink-0" />
                    <p>{error}</p>
                </div>
            {/if}

            {#if searchResult && !error}
                <div class="bg-[#151b30] border border-rose-500/30 rounded-xl p-8 shadow-lg shadow-black/20">
                    <div class="flex items-start justify-between mb-4">
                        <div>
                            <!-- <h2 class="text-3xl font-bold text-gray-100 mb-2">{searchResult.word}</h2> -->
                            <!-- <span class="bg-[#1e2947] text-blue-300 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider border border-blue-900/30">
                                {searchResult.partOfSpeech}
                            </span> -->
                        </div>
                        
                        {#if isInVocab}
                            <div class="flex items-center text-green-400 bg-green-400/10 px-4 py-2 rounded-lg border border-green-400/20">
                                <BookOpen size={18} class="mr-2" />
                                <span class="text-sm font-medium">In Vocabulary</span>
                            </div>
                        {:else}
                            <button 
                                onclick={addToVocabulary}
                                class="flex items-center bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-rose-900/20"
                            >
                                <Plus size={18} class="mr-2" />
                                Add Word
                            </button>
                        {/if}
                    </div>
                    
                    <div class="mt-6 pt-6 border-t border-gray-800">
                        <h4 class="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Definition</h4>
                        <!-- <p class="text-gray-300 text-lg leading-relaxed">
                            {searchResult.def}
                        </p> -->
                    </div>
                </div>
            {/if}
        </div>

        <div>
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold">Recently Added</h2>
                <a href="/" class="text-rose-500 hover:text-rose-400 text-sm font-medium transition-colors">
                    View All &rarr;
                </a>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {#each recentWords as item}
                    <div class="bg-[#151b30] border border-gray-800 hover:border-gray-600 rounded-xl p-6 transition-all duration-200 group cursor-pointer flex flex-col h-full shadow-md">
                        <div class="flex items-start justify-between mb-4">
                            <h3 class="text-xl font-bold text-gray-100 group-hover:text-rose-400 transition-colors">
                                {item.word}
                            </h3>
                            <span class="bg-[#1e2947] text-blue-300 text-[11px] px-3 py-1 rounded-full font-semibold uppercase tracking-wider border border-blue-900/30">
                                {item.pos}
                            </span>
                        </div>
                        <p class="text-gray-400 text-sm leading-relaxed mb-6 flex-grow">{item.def}</p>
                        <div class="flex items-center text-gray-500 text-xs mt-auto">
                            <Calendar size={14} class="mr-1.5" />
                            {item.date}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </main>
</div>