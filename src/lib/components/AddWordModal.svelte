<script lang="ts">
    import { X, Save } from "@lucide/svelte";
    import type { SearchResult, AddWordPayload } from "$lib/types";

    // Props
    // Bindable - This is a two-way connection. If the parent sets show to true, the modal opens. If the user clicks "Cancel" inside the modal and sets show to false, the parent instantly knows the modal closed.
    let { show = $bindable(), data, onConfirm } = $props<{
        show: boolean;
        data: SearchResult;
        onConfirm: (payload: AddWordPayload) => void;
    }>();

    // Local state for personal additions
    let personalMeaning = $state<string[]>([]);
    let personalExample = $state<string[]>([]);

    // Initialize arrays when data changes
    $effect(() => {
        if (data) {
            personalMeaning = data.allMeanings.map(() => "");
            personalExample = data.allMeanings.map(() => "");
        }
    });

    const handleSave = () => {
        const payload: AddWordPayload = {
            word: data!.word,
            meanings: data!.allMeanings.map((m: { pos: string; definitions: string[] }, i: number) => ({
                pos: m.pos,
                definitions: m.definitions,
                personalMeaning: personalMeaning[i],
                personalExample: personalExample[i]
            }))
        };
        onConfirm(payload);
    };
</script>

{#if show && data}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <div class="bg-[#151b30] border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            
            <div class="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1a213a] rounded-t-2xl">
                <div>
                    <h3 class="text-xl font-bold text-white text-brand">Customize Entry</h3>
                    <p class="text-gray-400 text-sm">Add personal notes to help you remember "{data.word}"</p>
                </div>
                <button onclick={() => show = false} class="text-gray-500 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div class="p-6 overflow-y-auto space-y-8">
                <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Word to Add</label>
                    <input type="text" value={data.word} disabled class="w-full bg-[#0d1120] border border-gray-800 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed font-bold text-xl" />
                </div>

                {#each data.allMeanings as meaning, i}
                    <div class="space-y-4 p-4 bg-[#1e253d]/50 rounded-xl border border-gray-800">
                        <div class="flex items-center gap-2">
                            <span class="bg-brand/20 text-brand text-[10px] px-2 py-0.5 rounded font-bold uppercase">{meaning.pos}</span>
                        </div>

                        <div class="space-y-3">
                            <div>
                                <label class="text-[10px] font-semibold text-gray-600 uppercase block mb-1">Dictionary Meaning</label>
                                <textarea disabled class="w-full bg-[#0d1120] border border-gray-800 rounded-lg px-3 py-2 text-gray-500 text-sm resize-none cursor-not-allowed">
                                    {meaning.definitions[0]}
                                </textarea>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-700/50">
                            <div>
                                <label class="text-[10px] font-bold text-brand uppercase block mb-1">Personal Mnemonic / Meaning</label>
                                <input 
                                    type="text" 
                                    bind:value={personalMeaning[i]} 
                                    placeholder="e.g. Sounds like..."
                                    class="w-full bg-[#151b30] border border-gray-700 focus:border-brand outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 transition-colors"
                                />
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-brand uppercase block mb-1">Personal Example</label>
                                <input 
                                    type="text" 
                                    bind:value={personalExample[i]} 
                                    placeholder="e.g. My boss is such a..."
                                    class="w-full bg-[#151b30] border border-gray-700 focus:border-brand outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <div class="p-6 border-t border-gray-800 bg-[#1a213a] flex gap-3 rounded-b-2xl">
                <button onclick={() => show = false} class="flex-1 px-4 py-3 rounded-xl font-medium text-gray-400 hover:bg-gray-800 transition-colors">
                    Cancel
                </button>
                <button 
                    onclick={handleSave}
                    class="flex-1 px-4 py-3 rounded-xl font-bold bg-brand-deep hover:bg-brand text-white flex items-center justify-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95"
                >
                    <Save size={18} />
                    Save to Vocabulary
                </button>
            </div>
        </div>
    </div>
{/if}