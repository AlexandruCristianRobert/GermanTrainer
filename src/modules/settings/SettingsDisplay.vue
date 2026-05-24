<script setup lang="ts">
import { usePromptSize } from '../../composables/usePromptSizes'
import TypeSizeField from './TypeSizeField.vue'

const verb = usePromptSize('verb')
const noun = usePromptSize('noun')
const adjective = usePromptSize('adjective')
const declension = usePromptSize('declension')
</script>

<template>
  <section>
    <!-- ── Verb test-sheet ───────────────────────────────────────── -->
    <TypeSizeField
      label="Verb test-sheet · type size"
      blurb="Controls verb size in the Translation worksheet. Smaller = more verbs visible without scrolling."
      :spec="verb.spec"
      :value="verb.value.value"
      @update:value="verb.setValue"
    />

    <div class="settings-preview">
      <div class="settings-preview-label">Verb worksheet · preview</div>
      <div class="test-row" style="border-bottom: none; padding-bottom: 0;">
        <div class="test-num"><strong>03.</strong></div>
        <div class="test-content">
          <div class="test-prompt-row">
            <span class="test-verb">aufstehen</span>
            <span class="test-chips">
              <span class="tag">A1</span>
              <span class="tag tag-cobalt">separable</span>
              <span class="tag">none</span>
            </span>
          </div>
          <input
            class="test-input"
            type="text"
            placeholder="English (to is optional)…"
            value="to get up"
            readonly
          />
        </div>
      </div>
    </div>

    <hr class="settings-divider" />

    <!-- ── Noun runner ──────────────────────────────────────────── -->
    <TypeSizeField
      label="Noun quiz · prompt size"
      blurb="Controls the big German word shown in the noun runner (e.g. Wasser, Mutter)."
      :spec="noun.spec"
      :value="noun.value.value"
      @update:value="noun.setValue"
    />

    <div class="settings-preview">
      <div class="settings-preview-label">Noun runner · preview</div>
      <div class="prompt-card preview-card">
        <div
          class="prompt-german"
          :style="{ fontSize: 'var(--noun-prompt-size, 92px)' }"
        >Wasser</div>
        <div class="prompt-english">water</div>
      </div>
    </div>

    <hr class="settings-divider" />

    <!-- ── Adjective runner ─────────────────────────────────────── -->
    <TypeSizeField
      label="Adjective quiz · sentence size"
      blurb="Controls the blanked sentence shown in the adjective runner."
      :spec="adjective.spec"
      :value="adjective.value.value"
      @update:value="adjective.setValue"
    />

    <div class="settings-preview">
      <div class="settings-preview-label">Adjective runner · preview</div>
      <div class="prompt-card preview-card preview-card-center">
        <div
          class="prompt-german"
          :style="{ fontSize: 'var(--adjective-prompt-size, 36px)', lineHeight: '1.3' }"
        >Ich sehe den ____ Park.</div>
        <div class="prompt-english" style="margin-top: 12px;">the beautiful park (acc.)</div>
      </div>
    </div>

    <hr class="settings-divider" />

    <!-- ── Declension runners ───────────────────────────────────── -->
    <TypeSizeField
      label="Declension quiz · prompt size"
      blurb="Controls the noun-phrase / blanked-sentence size in the three declension drills (decline-the-phrase, article-fill, adjective endings)."
      :spec="declension.spec"
      :value="declension.value.value"
      @update:value="declension.setValue"
    />

    <div class="settings-preview">
      <div class="settings-preview-label">Declension runner · preview</div>
      <div class="prompt-card preview-card preview-card-center">
        <div
          class="prompt-german"
          :style="{ fontSize: 'var(--decl-prompt-size, 56px)', lineHeight: '1.3' }"
        >Ich gebe ____ Mann das Buch.</div>
        <div class="prompt-english" style="margin-top: 12px;">I give the book to the man.</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-card {
  padding: 24px 0 16px;
  border-top: 0;
  border-bottom: 0;
}
.preview-card-center { text-align: center; }
</style>
