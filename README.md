# Print Gráfico Fácil

Estúdio para criação de relatórios visuais e gráficos de **Linha e Área** estilizados a partir de upload de CSV, Copy/Paste de planilhas ou inserção manual de pontos e rótulos, com **pré-visualização filtrável em tempo real**, **tipificação livre de colunas** no **DuckDB** e exportação de alta resolução em **PNG**.

## Stack Tecnológica
- **Backend**: Python + FastAPI + DuckDB + Pandas
- **Frontend**: Next.js (App Router + TypeScript) + Tailwind CSS + Lucide Icons + `html-to-image`

---

## 1. Executar Localmente (Linha de Comando)

Com um único comando na raiz do projeto:
```bash
./start.sh
```
Acesse **http://localhost:3000**.

---

## 2. Executar com Docker / Docker Compose

### Opção A: Via Docker Compose (Frontend + Backend + Volume Persistente DuckDB)
```bash
docker compose up --build
```
Acesse **http://localhost:3000** (o banco DuckDB ficará persistido no volume Docker `duckdb_data`).

### Opção B: Container Único (Dockerfile Unificado na Raiz)
Ideal para plataformas baseadas em imagem única de container (Cloud Run, Render, Railway, Fly.io):
```bash
docker build -t print-grafico-facil .
docker run -p 3000:3000 -v duckdb_data:/app/data print-grafico-facil
```

---

## 3. Deploy na Vercel

> **Nota sobre Arquitetura na Vercel**: A Vercel não executa imagens `Dockerfile` diretamente, mas possui suporte nativo híbrido para **Next.js + Python Serverless Functions (FastAPI)**. O projeto já está configurado com [vercel.json](file:///Users/francisco.godoy/Documents/ws_6_print_grafico_facil/vercel.json) e [api/index.py](file:///Users/francisco.godoy/Documents/ws_6_print_grafico_facil/api/index.py) para funcionar nativamente na Vercel (usando `/tmp/print_grafico.duckdb`).

Para publicar na Vercel via linha de comando:
```bash
npx vercel
```
Ou conecte seu repositório Git diretamente no painel da Vercel (mantendo o **Root Directory** na raiz do repositório).
