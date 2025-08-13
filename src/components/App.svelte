<script>
  import { Alert } from "flowbite-svelte"
  import { APP_STATUS, appStatus } from "../store.ts"
  import StepUpload from "./StepUpload.svelte"
  import StepLoading from "./StepLoading.svelte"
  import StepAnalyzing from "./StepAnalyzing.svelte"
  import StepNormalized from "./StepNormalized.svelte"
  

</script>

{#if $appStatus === APP_STATUS.INIT}
  <StepUpload />
{:else if $appStatus === APP_STATUS.LOADING}
  <StepLoading />
{:else if $appStatus === APP_STATUS.ANALYZING}
  <StepAnalyzing />
{:else if $appStatus === APP_STATUS.NORMALIZED}
  <StepNormalized />
{:else if $appStatus === APP_STATUS.ERROR}
  <Alert color="red">
    <span class="font-medium">¡Algo malo ha pasado!</span>
    Hay un error en la aplicación
  </Alert>
{:else}
  <Alert color="yellow">
    <span class="font-medium">Acción no reconocida</span>
    Este estado de la aplicación no está reconocido
  </Alert>
{/if}
