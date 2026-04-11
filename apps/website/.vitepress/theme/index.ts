import DefaultTheme from 'vitepress/theme'
import ThemeImage from './ThemeImage.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ThemeImage', ThemeImage)
  },
}
