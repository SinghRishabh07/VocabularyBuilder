<script lang="ts">
    import { Calendar, Quote } from "@lucide/svelte";
    
    let { word, meaning, date } = $props<{
        word: string;
        meaning: string;
        date: Date | string;
    }>();

    // Format the date to something readable
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date(date));
</script>

<div class="bg-[#151b30] border border-gray-800/50 rounded-2xl p-6 flex flex-col h-full shadow-sm">
    <div class="flex items-start justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-100 tracking-tight capitalize">
            {word}
        </h3>
    </div>

    <div class="flex-grow">
        <div class="flex gap-2 text-gray-400 italic mb-4">
            <Quote size={14} class="shrink-0 mt-1 text-rose-500/50" />
            <p class="text-sm leading-relaxed line-clamp-3">
                {meaning}
            </p>
        </div>
    </div>

    <div class="pt-4 border-t border-gray-800/50 flex items-center text-[11px] font-medium text-gray-500 uppercase tracking-widest">
        <Calendar size={12} class="mr-2 text-rose-500/70" />
        {formattedDate}
    </div>
</div>