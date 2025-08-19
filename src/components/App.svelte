<script lang="ts">
  import { currentStep, STEPS } from "../store"
  import StepUpload from "./StepUpload.svelte"
  import StepAnalyzing from "./StepAnalyzing.svelte"
</script>

{#if $currentStep === STEPS.UPLOAD}
  <StepUpload />
{:else if $currentStep === STEPS.ANALYZING}
  <StepAnalyzing />
{:else}
  <div class="min-h-screen p-4 sm:p-6">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Paso no reconocido</h2>
        <p class="text-gray-600">Este paso de la aplicación no está reconocido</p>
      </div>
    </div>
  </div>
{/if}
