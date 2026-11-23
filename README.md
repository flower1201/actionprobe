# actionprobe

**Offline lint for AI-generated GitHub Actions workflows. No Docker.**

Inspired by the jobs that [nektos/act](https://github.com/nektos/act) and [actionlint](https://github.com/rhysd/actionlint) cover — focused on the mistakes coding agents commonly emit (`@main` pins, missing `runs-on`, `curl | bash`, echoing secrets).

```bash
npm install && npm run build
npx actionprobe . --out ./actionprobe-report --fail
```

## License

MIT
