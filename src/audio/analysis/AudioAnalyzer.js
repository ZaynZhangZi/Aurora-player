import {ANALYZER_STATUS} from '@/audio/constants.js'
import {canRunAutomixAnalysis, getAudioCapabilities} from '@/audio/utils/getAudioCapabilities.js'
import {
  analyzeSongForAutomix,
  AUTOMIX_ANALYSIS_VERSION,
  disposeAutomixAnalysisWorker,
} from '@/utils/automixAnalysisClient.js'

export class AudioAnalyzer {
  constructor() {
    this.status = ANALYZER_STATUS.IDLE
  }

  async analyze(track, audioUrl, options = {}) {
    const capabilities = getAudioCapabilities()
    if (!canRunAutomixAnalysis(capabilities)) {
      const error = new Error('Browser audio analysis capabilities are unavailable')
      error.code = 'AUTOMIX_CAPABILITY_UNAVAILABLE'
      throw error
    }

    const onStatus = (status, detail = {}) => {
      this.status = status
      options.onStatus?.(status, detail)
    }

    return analyzeSongForAutomix(track, audioUrl, {
      ...options,
      onStatus,
    })
  }

  destroy() {
    disposeAutomixAnalysisWorker()
    this.status = ANALYZER_STATUS.IDLE
  }
}

export const audioAnalyzer = new AudioAnalyzer()
export {AUTOMIX_ANALYSIS_VERSION}
