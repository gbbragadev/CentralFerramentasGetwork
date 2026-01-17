import { AppLayout } from '@/layout/AppLayout';
import { Book, Code, Key, Server, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language = 'json' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copiar código"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function DocsPage() {
  return (
    <AppLayout title="Documentação">
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-blue-50 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Book className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Guia de Integração</h1>
              <p className="text-slate-600">Referência para integração com Senior X Platform</p>
            </div>
          </div>
        </div>

        {/* Autenticação */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Autenticação</h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              A autenticação com a plataforma Senior X é feita via <strong>Bearer Token</strong>. 
              O token é obtido através do endpoint de login.
            </p>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Endpoint de Login</h3>
              <CodeBlock 
                code={`POST https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform/authentication/actions/login

Content-Type: application/json

{
  "username": "usuario@tenant.com.br",
  "password": "sua_senha"
}`}
              />
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Usando o Token</h3>
              <p className="mb-2">Inclua o token no header de todas as requisições:</p>
              <CodeBlock 
                code={`Authorization: Bearer <SEU_TOKEN_AQUI>`}
              />
            </div>
          </div>
        </section>

        {/* APIs Disponíveis */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">APIs Disponíveis</h2>
          </div>
          
          <div className="space-y-6">
            {/* ECM/GED */}
            <div>
              <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">ECM/GED</span>
                Gestão Eletrônica de Documentos
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <code className="text-slate-700">/ecm_ged/queries/getSignedDocuments</code>
                  <span className="text-xs text-slate-500">Documentos assinados</span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-slate-700">/ecm_ged/queries/getSignatureEnvelopeConfiguration</code>
                  <span className="text-xs text-slate-500">Config. envelope</span>
                </div>
              </div>
            </div>

            {/* Sign */}
            <div>
              <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Sign</span>
                Assinatura Eletrônica
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <code className="text-slate-700">/sign/queries/listEnvelopes</code>
                  <span className="text-xs text-slate-500">Listar envelopes</span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-slate-700">/sign/queries/getSignatureEnvelopeConfiguration</code>
                  <span className="text-xs text-slate-500">Config. assinatura</span>
                </div>
              </div>
            </div>

            {/* HCM */}
            <div>
              <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">HCM</span>
                Ponto Mobile / Cercas Virtuais
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <code className="text-slate-700">/hcm/queries/employeesByFilterQuery</code>
                  <span className="text-xs text-slate-500">Buscar colaboradores</span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-slate-700">/hcm/queries/listCompanies</code>
                  <span className="text-xs text-slate-500">Listar filiais</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Extensão Chrome */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Code className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Extensão Chrome</h2>
          </div>
          
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              A extensão Chrome verifica o acesso do tenant através da nossa API pública.
              O tenant é identificado automaticamente via <code className="bg-slate-100 px-1 rounded">localStorage</code> do Senior X.
            </p>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Endpoint de Verificação</h3>
              <CodeBlock 
                code={`GET /api/v1/extension/verify

Headers:
  X-Senior-Tenant: tenant.com.br
  X-Extension-Version: 2.1

Response (sucesso):
{
  "allowed": true,
  "tenant": {
    "id": "uuid",
    "name": "Nome do Tenant",
    "domain": "tenant.com.br"
  },
  "product": {
    "code": "chrome_extension",
    "name": "Extensão Cercas Virtuais",
    "config": { ... },
    "expiresAt": null
  }
}`}
              />
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Identificação do Tenant</h3>
              <p className="mb-2">A extensão extrai o tenant do Senior X assim:</p>
              <CodeBlock 
                code={`// No content.js da extensão
const userInfo = localStorage.getItem('SENIOR_USER_INFO');
const { data: { tenantDomain } } = JSON.parse(userInfo);
// tenantDomain = "empresa.com.br"`}
                language="javascript"
              />
            </div>
          </div>
        </section>

        {/* Links Úteis */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <ExternalLink className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Links Úteis</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="https://dev.senior.com.br/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Book className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Portal do Desenvolvedor</p>
                <p className="text-xs text-slate-500">dev.senior.com.br</p>
              </div>
            </a>
            
            <a 
              href="https://api.xplatform.com.br/api-portal/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Server className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">API Portal</p>
                <p className="text-xs text-slate-500">api.xplatform.com.br</p>
              </div>
            </a>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
