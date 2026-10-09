# syntax=docker/dockerfile:1
# Tests de bout en bout (CdC technique § 12.2) : Playwright, contre l'image de production « site »
# (service « e2e », profil « test »). Version de l'image = version de @playwright/test
# (e2e/package.json), figée par empreinte (CdC technique § 5.5).
FROM mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27
WORKDIR /app/e2e
RUN chown pwuser:pwuser /app/e2e
USER pwuser
COPY --chown=pwuser:pwuser e2e/package.json e2e/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY --chown=pwuser:pwuser e2e/ ./
ENV CI=1
CMD ["npx", "playwright", "test"]
