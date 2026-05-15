<script lang="ts">
    let { word, date, onclick } = $props<{
        word: string;
        date: Date | string;
        onclick: () => void;
    }>();

    const formattedDate = $derived(
        new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(new Date(date)),
    );
</script>

<button
    type="button"
    onclick={onclick}
    class="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-200 bg-white/[0.03] hover:bg-white/[0.055] active:bg-white/[0.07] border border-white/[0.04] hover:border-white/[0.07] touch-manipulation min-h-[3.25rem]"
>
    <span
        class="text-[15px] font-semibold capitalize tracking-tight text-gray-100 group-active:text-white"
        >{word}</span
    >
    <span class="shrink-0 text-[12px] tabular-nums text-gray-500">{formattedDate}</span>
</button>
