import path from 'path'
import { crashReporter, ipcRenderer } from 'electron'
import log from 'electron-log'
import EnvPaths from 'common/envPaths'

let exceptionLogger = s => console.error(s)

const configureLogger = () => {
  const { debug, paths, windowId } = global.marktext.env
  log.transports.console.level = process.env.NODE_ENV === 'development' // mirror to window console
  log.transports.mainConsole = null
  log.transports.file.file = path.join(paths.logPath, `editor-${windowId}.log`)
  log.transports.file.level = debug ? 'debug' : 'info'
  log.transports.file.sync = false
  log.transports.file.init()
  exceptionLogger = log.error
}

const parseUrlArgs = () => {
  const params = new URLSearchParams(window.location.search)
  const codeFontFamily = params.get('cff')
  const codeFontSize = params.get('cfs')
  const debug = params.get('debug') === '1'
  const theme = params.get('theme')
  const titleBarStyle = params.get('tbs')
  const userDataPath = params.get('udp')
  const windowId = params.get('wid')
  const type = params.get('type')
  return {
    type,
    debug,
    userDataPath,
    windowId,
    initialState: {
      codeFontFamily,
      codeFontSize,
      theme,
      titleBarStyle
    }
  }
}

const bootstrapRenderer = () => {
  // Start crash reporter to save core dumps for the renderer process
  crashReporter.start({
    companyName: 'marktext',
    productName: 'marktext',
    submitURL: 'http://0.0.0.0/',
    uploadToServer: false
  })

  // Register renderer exception handler
  window.addEventListener('error', event => {
    const { message, name, stack } = event.error
    const copy = {
      message,
      name,
      stack
    }

    exceptionLogger(event.error)

    // Pass exception to main process exception handler to show a error dialog.
    ipcRenderer.send('AGANI::handle-renderer-error', copy)
  })

  // Remove the initial drag area.
  const initDragRegion = document.getElementById('init-drag-region')
  if (initDragRegion) {
    initDragRegion.remove()
  }

  const { debug, initialState, userDataPath, windowId, type } = parseUrlArgs()
  const marktext = {
    initialState,
    env: {
      debug,
      paths: new EnvPaths(userDataPath),
      windowId,
      type
    }
  }
  global.marktext = marktext

  configureLogger()
}

export default bootstrapRenderer
