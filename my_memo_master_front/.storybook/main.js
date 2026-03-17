

/** @type { import('@storybook/vue3-vite').StorybookConfig } */
const config = {
  staticDirs: ['../public'],
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": "@storybook/vue3-vite",
  async viteFinal(viteConfig) {
    viteConfig.plugins = (viteConfig.plugins || []).filter((plugin) => {
      const pluginName = String(plugin?.name || '')
      return !pluginName.startsWith('vite-plugin-pwa')
    })
    return viteConfig
  }
};
export default config;
