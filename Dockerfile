FROM node:22-alpine

ENV NODE_ENV=production
RUN npm install -g @clawfetch/mcp@0.3.2 && npm cache clean --force

USER node
ENTRYPOINT ["clawfetch-mcp"]
