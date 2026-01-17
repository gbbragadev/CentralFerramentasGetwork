import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { apiClient } from '@/api/client';
import { Tenant, Product, TenantProduct } from '@/api/types';
import { ArrowLeft, Plus, Trash2, Package, Calendar, Settings, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function TenantProductsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [tenantProducts, setTenantProducts] = useState<TenantProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTenantProduct, setSelectedTenantProduct] = useState<TenantProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    isActive: true,
    expiresAt: '',
  });

  const loadData = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    
    // Load tenant
    const tenantRes = await apiClient.get<Tenant>(`/tenants/${tenantId}`);
    if (tenantRes.data) {
      setTenant(tenantRes.data);
    }
    
    // Load all products
    const productsRes = await apiClient.get<Product[]>('/products');
    if (productsRes.data) {
      setProducts(productsRes.data);
    }
    
    // Load tenant products
    const tenantProductsRes = await apiClient.get<TenantProduct[]>(`/tenants/${tenantId}/products`);
    if (tenantProductsRes.data) {
      setTenantProducts(tenantProductsRes.data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleAddProduct = () => {
    setFormData({
      productId: '',
      isActive: true,
      expiresAt: '',
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (tenantProduct: TenantProduct) => {
    setSelectedTenantProduct(tenantProduct);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTenantProduct || !tenantId) return;

    setSubmitting(true);
    const response = await apiClient.delete(`/tenants/${tenantId}/products/${selectedTenantProduct.id}`);
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Produto removido do tenant');
      setIsDeleteModalOpen(false);
      loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId || !tenantId) {
      toast.error('Selecione um produto');
      return;
    }

    setSubmitting(true);
    const response = await apiClient.post(`/tenants/${tenantId}/products`, {
      productId: formData.productId,
      isActive: formData.isActive,
      expiresAt: formData.expiresAt || null,
    });
    setSubmitting(false);

    if (response.error) {
      toast.error(response.error.message);
    } else {
      toast.success('Produto adicionado ao tenant');
      setIsAddModalOpen(false);
      loadData();
    }
  };

  // Filter out products already assigned to tenant
  const availableProducts = products.filter(
    p => !tenantProducts.some(tp => tp.productId === p.id)
  );

  const columns = [
    {
      header: 'Produto',
      accessor: (row: TenantProduct) => {
        const product = products.find(p => p.id === row.productId);
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-slate-900">{product?.name || 'Produto desconhecido'}</div>
              <div className="text-xs text-slate-500 font-mono">{product?.code}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: (row: TenantProduct) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
            row.isActive
              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
              : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/20'
          }`}
        >
          {row.isActive ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      header: 'Expiração',
      accessor: (row: TenantProduct) => {
        if (!row.expiresAt) {
          return <span className="text-slate-500 text-sm">Sem expiração</span>;
        }
        const expiresAt = new Date(row.expiresAt);
        const isExpired = expiresAt < new Date();
        return (
          <span className={`inline-flex items-center gap-1 text-sm ${isExpired ? 'text-red-600' : 'text-slate-700'}`}>
            <Calendar className="h-3 w-3" />
            {expiresAt.toLocaleDateString('pt-BR')}
            {isExpired && <span className="text-xs">(expirado)</span>}
          </span>
        );
      },
    },
    {
      header: 'Ações',
      accessor: (row: TenantProduct) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteClick(row)}
            title="Remover produto"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout title={`Produtos - ${tenant?.name || 'Carregando...'}`}>
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/tenants')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Tenants
          </Button>
        </div>

        {/* Tenant Info */}
        {tenant && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Settings className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{tenant.name}</h2>
                <p className="text-sm text-slate-500">Gerencie os produtos disponíveis para este tenant</p>
              </div>
            </div>
          </div>
        )}

        {/* Add Product Button */}
        <div className="flex justify-end">
          <Button onClick={handleAddProduct} disabled={availableProducts.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>

        {/* Products Table */}
        <Table
          columns={columns}
          data={tenantProducts}
          loading={loading}
          emptyMessage="Nenhum produto atribuído a este tenant"
          emptyAction={
            availableProducts.length > 0 ? (
              <Button onClick={handleAddProduct} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeiro produto
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Adicionar Produto"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Produto</label>
            <select
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            >
              <option value="">Selecione um produto</option>
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data de Expiração (opcional)</label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-slate-500 mt-1">
              Deixe em branco para acesso sem expiração
            </p>
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
              Ativo
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Adicionar Produto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Remoção"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-slate-900 font-medium">
                Remover produto do tenant?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                O tenant perderá acesso a este produto imediatamente.
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
              Remover Produto
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
