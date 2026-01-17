import { useState, useEffect } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { apiClient } from '@/api/client';
import { Product } from '@/api/types';
import { Plus, Edit, Trash2, Package, AlertTriangle, FileText, MessageSquare, Calendar, Bell } from 'lucide-react';
import { toast } from 'sonner';

// Ícones disponíveis para produtos
const productIcons: Record<string, React.ElementType> = {
  'file-text': FileText,
  'message-square': MessageSquare,
  'calendar': Calendar,
  'bell': Bell,
  'package': Package,
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: 'package',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    const response = await apiClient.get<Product[]>('/products');
    if (response.data) {
      setProducts(response.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreate = () => {
    setSelectedProduct(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      icon: 'package',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || '',
      icon: product.icon || 'package',
      isActive: product.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/products/${selectedProduct.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Produto excluído com sucesso');
      setIsDeleteModalOpen(false);
      loadProducts();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error('O código é obrigatório');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    // Valida formato do código (uppercase, underscores)
    const codeRegex = /^[A-Z][A-Z0-9_]*$/;
    if (!codeRegex.test(formData.code)) {
      toast.error('O código deve conter apenas letras maiúsculas, números e underscores');
      return;
    }

    setSubmitting(true);
    const response = selectedProduct
      ? await apiClient.put(`/products/${selectedProduct.id}`, formData)
      : await apiClient.post('/products', formData);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success(selectedProduct ? 'Produto atualizado' : 'Produto criado');
      setIsModalOpen(false);
      loadProducts();
    }
  };

  const getIcon = (iconName: string | null) => {
    const IconComponent = productIcons[iconName || 'package'] || Package;
    return <IconComponent className="h-5 w-5 text-slate-500" />;
  };

  const columns = [
    {
      header: 'Produto',
      accessor: (row: Product) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
            {getIcon(row.icon)}
          </div>
          <div>
            <div className="font-medium text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-500 font-mono">{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Descrição',
      accessor: (row: Product) => (
        <span className="text-slate-600 text-sm">
          {row.description || '-'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Product) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
            row.isActive
              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
              : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
          }`}
        >
          {row.isActive ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: (row: Product) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(row)}
            title="Editar produto"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteClick(row)}
            title="Excluir produto"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Produtos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-slate-600">
            Gerencie os produtos disponíveis na plataforma
          </p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>

        <Table
          columns={columns}
          data={products}
          loading={loading}
          emptyMessage="Nenhum produto cadastrado"
          emptyAction={
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro produto
            </Button>
          }
        />
      </div>

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct ? 'Editar Produto' : 'Novo Produto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Código"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="Ex: WHATSAPP_NOTIFICATIONS"
            required
            disabled={!!selectedProduct}
          />
          <p className="text-xs text-slate-500 -mt-2">
            Identificador único do produto. Não pode ser alterado após criação.
          </p>

          <Input
            label="Nome"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Notificações WhatsApp"
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do produto..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Ícone
            </label>
            <div className="flex gap-2">
              {Object.entries(productIcons).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: key })}
                  className={`p-2 rounded-md border ${
                    formData.icon === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Produto ativo
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {selectedProduct ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-slate-900 font-medium">
                Excluir produto "{selectedProduct?.name}"?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Esta ação não pode ser desfeita. Todos os tenants que utilizam este produto
                perderão o acesso.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={submitting}
            >
              Excluir Produto
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
