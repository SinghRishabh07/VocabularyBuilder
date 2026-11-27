<script lang="ts">
    import { Check, X, Eye, Lightbulb, ArrowRight } from "@lucide/svelte";
    import type { ReviewGrade, ReviewItem } from "$lib/types";

    let {
        item,
        retry = false,
        onanswer,
        oncontinue,
    } = $props<{
        item: ReviewItem;
        /** Second look at a missed word — not graded again */
        retry?: boolean;
        onanswer: (r: { grade: ReviewGrade; correct: boolean }) => void;
        oncontinue: () => void;
    }>();

    type Phase = "ask" | "feedback";
    let phase = $state<Phase>("ask");
    let revealed = $state(false);
    let picked = $state<string | null>(null);
    let typed = $state("");
    let hintUsed = $state(false);
    let wasCorrect = $state(false);
    let inputEl: HTMLInputElement | null = $state(null);

    let activity = $derived(retry ? "flashcard" : item.activity);
    let answer = $derived(item.activity === "meaning-mcq" ? item.meaning : item.word);
    let hint = $derived.by(() => {
        const target = item.answerForm ?? item.word;
        const shown = Math.min(2, Math.max(1, Math.floor(target.length / 4)));
        return `${target.slice(0, shown)}${"·".repeat(Math.max(0, target.length - shown))}`;
    });

    $effect(() => {
        if (activity === "fill-blank" && phase === "ask") inputEl?.focus();
    });

    function finish(grade: ReviewGrade, correct: boolean) {
        wasCorrect = correct;
        phase = "feedback";
        if (!retry) onanswer({ grade, correct });
    }

    function pick(option: string) {
        if (phase !== "ask") return;
        picked = option;
        const ok = option === answer;
        finish(ok ? "good" : "forgot", ok);
    }

    function rate(grade: ReviewGrade) {
        if (retry) {
            oncontinue();
            return;
        }
        onanswer({ grade, correct: grade !== "forgot" });
        oncontinue();
    }

    function editDistance(a: string, b: string): number {
        const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
        for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
        for (let i = 1; i <= a.length; i++)
            for (let j = 1; j <= b.length; j++)
                dp[i]![j] = Math.min(
                    dp[i - 1]![j]! + 1,
                    dp[i]![j - 1]! + 1,
                    dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
                );
        return dp[a.length]![b.length]!;
    }

    function checkTyped(ev?: Event) {
        ev?.preventDefault();
        if (phase !== "ask") return;
        const guess = typed.trim().toLowerCase();
        if (!guess) return;
        const targets = [item.answerForm, item.word]
            .filter((t): t is string => Boolean(t))
            .map((t) => t.toLowerCase());
        // Forgive a single typo on longer words
        const ok = targets.some(
            (t) => t === guess || (t.length >= 6 && editDistance(t, guess) <= 1),
        );
        finish(ok ? (hintUsed ? "hard" : "good") : "forgot", ok);
    }

    function giveUp() {
        if (phase !== "ask") return;
        finish("forgot", false);
    }

    function optionClass(option: string) {
        const base =
            "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[14px] leading-snug transition-colors duration-150 touch-manipulation";
        if (phase === "ask")
            return `${base} border-white/[0.08] bg-white/[0.03] text-gray-200 hover:border-brand/30 hover:bg-brand/[0.06] active:bg-brand/10`;
        if (option === answer)
            return `${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-100`;
        if (option === picked)
            return `${base} border-red-500/40 bg-red-500/10 text-red-200`;
        return `${base} border-white/[0.05] bg-transparent text-gray-500`;
    }

    export function handleKey(e: KeyboardEvent): boolean {
        const target = e.target as HTMLElement | null;
        const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
        if (phase === "feedback" && e.key === "Enter" && activity !== "flashcard") {
            oncontinue();
            return true;
        }
        if (typing) return false;
        if (activity === "flashcard") {
            if (!revealed && (e.key === " " || e.key === "Enter")) {
                revealed = true;
                return true;
            }
            if (revealed && !retry) {
                const map: Record<string, ReviewGrade> = { "1": "forgot", "2": "hard", "3": "good" };
                if (map[e.key]) {
                    rate(map[e.key]!);
                    return true;
                }
            }
            if (revealed && retry && e.key === "Enter") {
                oncontinue();
                return true;
            }
        }
        if ((activity === "meaning-mcq" || activity === "word-mcq") && phase === "ask") {
            const idx = Number(e.key) - 1;
            const opt = item.options?.[idx];
            if (opt) {
                pick(opt);
                return true;
            }
        }
        return false;
    }
</script>

<div class="rounded-2xl border border-white/[0.08] bg-[var(--surface-1)] p-4 md:p-5">
    {#if retry}
        <p class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-amber-300/80">
            One more look
        </p>
    {:else if item.reason === "new"}
        <p class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-brand/80">New word</p>
    {:else if item.reason === "struggling"}
        <p class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-amber-300/80">
            Needs practice
        </p>
    {/if}

    {#if activity === "flashcard"}
        <div class="flex flex-col items-center py-4 text-center">
            <h2 class="text-[1.75rem] font-semibold capitalize tracking-tight text-white">
                {item.word}
            </h2>
            <span
                class="mt-2 inline-block rounded-md border border-brand/20 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand"
            >
                {item.pos}
            </span>

            {#if !revealed}
                <p class="mt-5 text-[13px] text-gray-500">Do you remember what it means?</p>
                <button
                    type="button"
                    onclick={() => (revealed = true)}
                    class="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[14px] font-semibold text-gray-200 transition hover:border-brand/30 hover:bg-brand/10 hover:text-white touch-manipulation"
                >
                    <Eye size={17} aria-hidden="true" />
                    Show meaning
                </button>
            {:else}
                <p class="mt-5 max-w-md text-[15px] leading-relaxed text-gray-200">{item.meaning}</p>
                {#if item.example}
                    <p class="mt-3 max-w-md border-l-2 border-white/10 pl-3 text-left text-[13px] italic text-gray-400">
                        {item.example}
                    </p>
                {/if}
            {/if}
        </div>

        {#if revealed}
            {#if retry}
                <button
                    type="button"
                    onclick={oncontinue}
                    class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-brand active:scale-[0.99] touch-manipulation"
                >
                    Got it <ArrowRight size={17} aria-hidden="true" />
                </button>
            {:else}
                <p class="mt-2 mb-2 text-center text-[12px] text-gray-500">How well did you know it?</p>
                <div class="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onclick={() => rate("forgot")}
                        class="rounded-xl border border-red-500/25 bg-red-500/[0.07] px-2 py-3 text-[13px] font-semibold text-red-300 transition hover:bg-red-500/15 active:scale-[0.98] touch-manipulation"
                    >
                        Forgot
                    </button>
                    <button
                        type="button"
                        onclick={() => rate("hard")}
                        class="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-2 py-3 text-[13px] font-semibold text-amber-200 transition hover:bg-amber-500/15 active:scale-[0.98] touch-manipulation"
                    >
                        Struggled
                    </button>
                    <button
                        type="button"
                        onclick={() => rate("good")}
                        class="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-2 py-3 text-[13px] font-semibold text-emerald-300 transition hover:bg-emerald-500/15 active:scale-[0.98] touch-manipulation"
                    >
                        Knew it
                    </button>
                </div>
                <p class="mt-2 hidden text-center text-[11px] text-gray-600 lg:block">Keys 1 · 2 · 3</p>
            {/if}
        {/if}
    {:else if activity === "meaning-mcq" || activity === "word-mcq"}
        {#if activity === "meaning-mcq"}
            <p class="text-[13px] text-gray-500">What does this word mean?</p>
            <h2 class="mt-1 text-[1.5rem] font-semibold capitalize tracking-tight text-white">
                {item.word}
                <span class="ml-1 align-middle text-[11px] font-semibold uppercase tracking-wide text-brand">{item.pos}</span>
            </h2>
        {:else}
            <p class="text-[13px] text-gray-500">Which word matches this meaning?</p>
            <p class="mt-1.5 text-[16px] leading-relaxed text-gray-100">
                <span class="mr-1 text-[11px] font-semibold uppercase tracking-wide text-brand">{item.pos}</span>
                {item.meaning}
            </p>
        {/if}

        <ul class="mt-4 space-y-2" role="list">
            {#each item.options ?? [] as option, i (option)}
                <li>
                    <button
                        type="button"
                        onclick={() => pick(option)}
                        disabled={phase !== "ask"}
                        class={optionClass(option)}
                    >
                        <span
                            class="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/10 text-[11px] font-semibold tabular-nums text-gray-500"
                            aria-hidden="true"
                        >
                            {#if phase === "feedback" && option === answer}
                                <Check size={13} strokeWidth={3} class="text-emerald-300" />
                            {:else if phase === "feedback" && option === picked}
                                <X size={13} strokeWidth={3} class="text-red-300" />
                            {:else}
                                {i + 1}
                            {/if}
                        </span>
                        <span class={activity === "word-mcq" ? "font-semibold capitalize" : ""}>{option}</span>
                    </button>
                </li>
            {/each}
        </ul>
    {:else if activity === "fill-blank"}
        <p class="text-[13px] text-gray-500">Fill in the missing word</p>
        <p class="mt-2 text-[16px] leading-relaxed text-gray-100">{item.cloze}</p>
        <p class="mt-2 text-[13px] text-gray-500">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-brand">{item.pos}</span>
            · {item.meaning}
        </p>

        <form class="mt-4" onsubmit={checkTyped}>
            <label class="sr-only" for="cloze-answer">Your answer</label>
            <div
                class="flex items-center rounded-xl border bg-[var(--surface-2)] px-3 transition-colors {phase === 'feedback'
                    ? wasCorrect
                        ? 'border-emerald-500/40'
                        : 'border-red-500/40'
                    : 'border-white/[0.08] focus-within:border-brand/45'}"
            >
                <input
                    id="cloze-answer"
                    bind:this={inputEl}
                    bind:value={typed}
                    disabled={phase !== "ask"}
                    autocomplete="off"
                    autocapitalize="off"
                    autocorrect="off"
                    spellcheck={false}
                    enterkeyhint="done"
                    placeholder={hintUsed ? hint : "Type the word…"}
                    class="min-h-11 flex-1 bg-transparent py-2.5 text-[15px] text-gray-100 outline-none placeholder:text-gray-600"
                />
            </div>
            {#if phase === "ask"}
                <div class="mt-3 flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={!typed.trim()}
                        class="flex-1 rounded-xl bg-brand-deep px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand active:scale-[0.99] touch-manipulation disabled:opacity-50"
                    >
                        Check
                    </button>
                    {#if !hintUsed}
                        <button
                            type="button"
                            onclick={() => {
                                hintUsed = true;
                                inputEl?.focus();
                            }}
                            class="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] px-3 py-2.5 text-[13px] font-medium text-gray-300 transition hover:bg-white/[0.05] touch-manipulation"
                        >
                            <Lightbulb size={15} aria-hidden="true" /> Hint
                        </button>
                    {/if}
                    <button
                        type="button"
                        onclick={giveUp}
                        class="rounded-xl px-3 py-2.5 text-[13px] font-medium text-gray-500 transition hover:bg-white/[0.05] hover:text-gray-300 touch-manipulation"
                    >
                        I don't know
                    </button>
                </div>
            {/if}
        </form>
    {/if}

    {#if phase === "feedback" && activity !== "flashcard"}
        <div
            class="mt-4 rounded-xl border px-3.5 py-3 {wasCorrect
                ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                : 'border-red-500/20 bg-red-500/[0.06]'}"
            role="status"
        >
            <p class="text-[14px] font-semibold {wasCorrect ? 'text-emerald-300' : 'text-red-300'}">
                {#if wasCorrect}
                    {hintUsed ? "Correct, with a hint" : "Correct!"}
                {:else}
                    Not quite. It's <span class="capitalize">{item.answerForm ?? item.word}</span>
                {/if}
            </p>
            {#if !wasCorrect || activity === "word-mcq" || activity === "fill-blank"}
                <p class="mt-1 text-[13px] leading-relaxed text-gray-300">
                    <span class="font-semibold capitalize text-white">{item.word}</span>: {item.meaning}
                </p>
            {/if}
            {#if item.example && activity !== "fill-blank"}
                <p class="mt-2 border-l-2 border-white/10 pl-3 text-[12px] italic text-gray-400">{item.example}</p>
            {/if}
        </div>
        <button
            type="button"
            onclick={oncontinue}
            class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-brand active:scale-[0.99] touch-manipulation"
        >
            Continue <ArrowRight size={17} aria-hidden="true" />
        </button>
    {/if}
</div>
