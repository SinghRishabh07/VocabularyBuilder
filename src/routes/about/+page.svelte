<script>
    import { ArrowLeft, BookOpen } from "@lucide/svelte";
</script>

<div class="min-h-screen bg-[#020617] text-gray-300">
    <!-- Top Bar -->
    <!-- <div class="border-b border-gray-900">
        <div
            class="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between"
        >
            <a
                href="/"
                class="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition"
            >
                <ArrowLeft size={18} />
                Back to App
            </a>

            <div class="flex items-center gap-2 font-semibold text-gray-200">
                <BookOpen size={18} />
                <span>VocabVault</span>
            </div>
        </div>
    </div> -->

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-6 py-14">
        <!-- Header -->
        <div class="mb-14">
            <p class="text-xs tracking-widest text-brand font-semibold mb-4">
                ABOUT THE PROJECT
            </p>

            <h1
                class="text-4xl md:text-5xl font-bold text-gray-100 mb-5 leading-tight"
            >
                The story behind VocabVault
            </h1>

            <p class="text-lg text-gray-400 max-w-2xl">
                A personal vocabulary builder born out of a simple frustration —
                forgetting words right after looking them up.
            </p>
        </div>

        <!-- Introduction -->
        <section class="mb-16 space-y-5">
            <h2 class="text-2xl font-semibold text-gray-100">Introduction</h2>

            <p class="leading-relaxed text-gray-400">
                We've all been there — you come across a beautiful word while
                reading, look it up, nod approvingly, and then completely forget
                it by the next morning. Traditional flashcard apps feel
                mechanical, and dictionary bookmarks pile up without any real
                learning happening.
            </p>

            <p class="leading-relaxed text-gray-400">
                <span class="font-semibold text-gray-200">VocabVault</span> was created
                to solve this. It's a personal vocabulary journal where you don't
                just store definitions — you capture what a word means to you. Your
                own interpretation, your own examples, your own context. Because
                words stick when they're personal.
            </p>

            <p class="leading-relaxed text-gray-400">
                Whether you're a student preparing for exams, a writer expanding
                your lexicon, or simply someone who loves language — VocabVault
                gives you a quiet, focused space to grow your vocabulary at your
                own pace.
            </p>
        </section>

        <!-- What does it do -->
        <section class="mb-16 space-y-6">
            <h2 class="text-2xl font-semibold text-gray-100">
                What does VocabVault do?
            </h2>

            <p class="text-gray-400">
                At its core, VocabVault lets you build a personal dictionary.
                But unlike a regular dictionary, every entry has two sides:
            </p>

            <!-- Feature Card -->
            <div class="border border-gray-800 bg-[#020b1f] rounded-xl p-6">
                <ul class="space-y-6">
                    <li class="flex gap-4">
                        <div
                            class="w-2 h-2 mt-2 rounded-full bg-brand"
                        ></div>
                        <div>
                            <p class="font-semibold text-gray-200">
                                Dictionary Meaning
                            </p>
                            <p class="text-sm text-gray-400">
                                The formal, textbook definition of the word.
                            </p>
                        </div>
                    </li>

                    <li class="flex gap-4">
                        <div
                            class="w-2 h-2 mt-2 rounded-full bg-brand"
                        ></div>
                        <div>
                            <p class="font-semibold text-gray-200">
                                Your Meaning
                            </p>
                            <p class="text-sm text-gray-400">
                                How you understand it — in your own words, your
                                own way.
                            </p>
                        </div>
                    </li>

                    <li class="flex gap-4">
                        <div
                            class="w-2 h-2 mt-2 rounded-full bg-brand"
                        ></div>
                        <div>
                            <p class="font-semibold text-gray-200">
                                Personal Examples
                            </p>
                            <p class="text-sm text-gray-400">
                                Sentences from your life, not a textbook.
                            </p>
                        </div>
                    </li>
                </ul>
            </div>

            <p class="text-gray-400">
                You can filter words by type (noun, verb, adjective, adverb),
                search through your collection, and tap on any word card to see
                its full detail. It's designed to feel like flipping through a
                beautifully organized notebook.
            </p>
        </section>

        <!-- Team -->
        <section class="mb-20 space-y-6">
            <h2 class="text-2xl font-semibold text-gray-100">
                Who built this?
            </h2>

            <div class="border border-gray-800 rounded-xl p-6 bg-[#020b1f] mt-8">

                <h3 class="text-lg font-semibold text-gray-100 mb-6">
                    Credits
                </h3>
            
                <div class="space-y-6 text-sm">
            
                    <!-- Developer -->
                    <div>
                        <p class="text-gray-400 mb-2 font-medium">Developer</p>
            
                        <div class="flex flex-col gap-1">
                            <a href="mailto:rishabh.work.dev07@gmail.com"
                               class="text-brand hover:text-brand-bright underline underline-offset-4">
                                rishabh.work.dev07@gmail.com
                            </a>
            
                            <a href="https://github.com/SinghRishabh07/VocabularyBuilder"
                               target="_blank"
                               class="text-brand hover:text-brand-bright underline underline-offset-4">
                                https://github.com/SinghRishabh07
                            </a>
                        </div>
                    </div>
            
                    <!-- Project -->
                    <div>
                        <p class="text-gray-400 mb-2 font-medium">Project</p>
            
                        <a href="https://github.com/SinghRishabh07/VocabularyBuilder"
                           target="_blank"
                           class="text-brand hover:text-brand-bright underline underline-offset-4">
                            https://github.com/SinghRishabh07/VocabularyBuilder
                        </a>
                    </div>
            
                    <!-- Tools -->
                    <div>
                        <p class="text-gray-400 mb-2 font-medium">Tools</p>
            
                        <p class="text-gray-300">
                            Cursor, Hosting Provider
                        </p>
                    </div>
            
                    <!-- Stack -->
                    <div>
                        <p class="text-gray-400 mb-2 font-medium">Stack</p>
            
                        <p class="text-gray-300">
                            SvelteKit 5, TailwindCSS, PostgreSQL
                        </p>
                    </div>
            
                </div>
            </div>

            <!-- <p class="text-gray-400 text-sm">
                The project is built with SvelteKit, styled with Tailwind CSS,
                icons from Lucide, and designed to feel lightweight and focused.
            </p> -->
        </section>

        <!-- CTA -->
        <section
            class="border border-brand/25 bg-[#020b1f] rounded-xl p-10 text-center mb-16"
        >
            <h3 class="text-xl font-semibold text-gray-100 mb-2">
                Ready to start your vocabulary journey?
            </h3>

            <p class="text-gray-400 mb-6 max-w-md mx-auto">
                Every word you save is a word you'll remember. Your personal
                dictionary is waiting.
            </p>

            <a
                href="/"
                class="inline-block bg-brand hover:bg-brand-deep text-white
                       px-6 py-3 rounded-lg font-semibold transition"
            >
                Get Started
            </a>
        </section>
    </main>
</div>
