<script lang="ts">
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";

    let { word = $bindable(), open = $bindable() } = $props<{
        word: { id: string; word: string } | null;
        open: boolean;
    }>();

    // --- FUNCTIONS --- Delete a word from your vocabulary
    const deleteWord = async (e: Event, id: string) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/words/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Word deleted successfully! 🗑️");
            open = false;
            word = null;
            await invalidateAll();
        } catch (err) {
            console.error("Failed to delete the word. Please try again.", err);
            toast.error("Failed to delete the word. Please try again.");
        }
    };
</script>

{#if open && word}
    <div
        class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        tabindex="-1"
        onclick={() => (open = false)}
        onkeydown={(e) => e.key === "Escape" && (open = false)}
    >
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            class="bg-[#020b1f] border border-gray-800 rounded-xl w-full max-w-md p-6 shadow-xl"
            role="document"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") open = false;
            }}
        >
            <h2 id="delete-modal-title" class="text-lg font-semibold text-gray-100 mb-2">
                Delete "{word.word}"?
            </h2>

            <p class="text-sm text-gray-400 mb-6">
                This will permanently remove this word from your vocabulary.
            </p>

            <div class="flex justify-end gap-3">
                <button
                    type="button"
                    class="px-4 py-2 text-sm border border-gray-700 rounded-lg text-gray-300 hover:border-gray-500 transition cursor-pointer"
                    onclick={() => (open = false)}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="px-4 py-2 text-sm bg-brand-deep hover:bg-brand text-white rounded-lg transition cursor-pointer"
                    onclick={(e) => deleteWord(e, word.id)}
                >
                    Delete
                </button>
            </div>
        </div>
    </div>
{/if}
