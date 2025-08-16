<script lang="ts">
  import { Alert } from "flowbite-svelte"
  import { currentStep, STEPS } from "../store"
  import StepUpload from "./StepUpload.svelte"
  import StepAnalyzing from "./StepAnalyzing.svelte"
  import StepNormalized from "./StepNormalized.svelte"
</script>

{#if $currentStep === STEPS.UPLOAD}
  <StepUpload />
{:else if $currentStep === STEPS.ANALYZING}
  <StepAnalyzing />
{:else if $currentStep === STEPS.NORMALIZED}
  <StepNormalized />
{:else}
  <Alert color="yellow">
    <span class="font-medium">Paso no reconocido</span>
    Este paso de la aplicación no está reconocido
  </Alert>
{/if}
