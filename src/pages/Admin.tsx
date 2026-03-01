import React, { useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import { Plus, Trash2, Save, Settings as SettingsIcon, Package, Image as ImageIcon, LogOut, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db as firestore } from "../firebase";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";

export default function Admin() {
  const { settings, refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<"products" | "settings" | "carousel">("products");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: 0, old_price: 0, 
    image_url: "", image_url_2: "", image_url_3: "", image_url_4: "", image_url_5: "",
    category_id: 1,
    is_queridinho: false, is_destaque: false, is_mais_vendido: false, is_top_bar: false
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [localSettings, setLocalSettings] = useState(settings);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    setLocalSettings(settings);
  }, [settings]);

  const fetchProducts = () => fetch("/api/products").then(res => res.json()).then(setProducts);
  const fetchCategories = () => fetch("/api/categories").then(res => res.json()).then(setCategories);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct)
    });
    if (res.ok) {
      // Sync to Firebase
      try {
        await addDoc(collection(firestore, "products_log"), {
          ...newProduct,
          action: editingId ? "update" : "create",
          timestamp: new Date()
        });
      } catch (e) { console.error("Firebase sync error:", e); }

      fetchProducts();
      setNewProduct({
        name: "", description: "", price: 0, old_price: 0, 
        image_url: "", image_url_2: "", image_url_3: "", image_url_4: "", image_url_5: "",
        category_id: 1,
        is_queridinho: false, is_destaque: false, is_mais_vendido: false, is_top_bar: false
      });
      setEditingId(null);
    }
  };

  const handleEditClick = (p: any) => {
    setEditingId(p.id);
    setNewProduct({
      name: p.name,
      description: p.description,
      price: p.price,
      old_price: p.old_price || 0,
      image_url: p.image_url,
      image_url_2: p.image_url_2 || "",
      image_url_3: p.image_url_3 || "",
      image_url_4: p.image_url_4 || "",
      image_url_5: p.image_url_5 || "",
      category_id: p.category_id,
      is_queridinho: p.is_queridinho === 1,
      is_destaque: p.is_destaque === 1,
      is_mais_vendido: p.is_mais_vendido === 1,
      is_top_bar: p.is_top_bar === 1
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm("Tem certeza?")) {
      await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      fetchProducts();
    }
  };

  const handleSaveSettings = async () => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(localSettings)
    });
    if (res.ok) {
      // Store in Firebase
      try {
        await setDoc(doc(firestore, "site_config", "settings"), localSettings);
      } catch (e) { console.error("Firebase settings error:", e); }

      refreshSettings();
      alert("Configurações salvas!");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    navigate("/login");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <div className="mb-12 flex items-center justify-between">
        <h1 className="font-display text-4xl sm:text-5xl font-bold lowercase tracking-tight text-gray-900 leading-none">painel admin</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-red-500 uppercase">
          <LogOut size={18} /> Sair
        </button>
      </div>

      <div className="flex gap-4 border-b mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: "products", label: "Produtos", icon: Package },
          { id: "settings", label: "Configurações", icon: SettingsIcon },
          { id: "carousel", label: "Banner Principal", icon: ImageIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab.id ? "border-[#FF0080] text-[#FF0080]" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "products" && (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Add Product Form */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-black uppercase tracking-widest">
                {editingId ? "Editar Produto" : "Novo Produto"}
              </h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <input 
                  type="text" placeholder="Nome do Produto" 
                  value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full rounded-lg border p-3 text-sm" required 
                />
                <textarea 
                  placeholder="Descrição" 
                  value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full rounded-lg border p-3 text-sm" required 
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="number" step="0.01" placeholder="Preço" 
                    value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                    className="w-full rounded-lg border p-3 text-sm" required 
                  />
                  <input 
                    type="number" step="0.01" placeholder="Preço Antigo" 
                    value={newProduct.old_price} onChange={e => setNewProduct({...newProduct, old_price: parseFloat(e.target.value)})}
                    className="w-full rounded-lg border p-3 text-sm" 
                  />
                </div>
                <input 
                  type="text" placeholder="URL da Imagem Principal" 
                  value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})}
                  className="w-full rounded-lg border p-3 text-sm" required 
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" placeholder="Imagem 2 (opcional)" 
                    value={newProduct.image_url_2} onChange={e => setNewProduct({...newProduct, image_url_2: e.target.value})}
                    className="w-full rounded-lg border p-3 text-xs" 
                  />
                  <input 
                    type="text" placeholder="Imagem 3 (opcional)" 
                    value={newProduct.image_url_3} onChange={e => setNewProduct({...newProduct, image_url_3: e.target.value})}
                    className="w-full rounded-lg border p-3 text-xs" 
                  />
                  <input 
                    type="text" placeholder="Imagem 4 (opcional)" 
                    value={newProduct.image_url_4} onChange={e => setNewProduct({...newProduct, image_url_4: e.target.value})}
                    className="w-full rounded-lg border p-3 text-xs" 
                  />
                  <input 
                    type="text" placeholder="Imagem 5 (opcional)" 
                    value={newProduct.image_url_5} onChange={e => setNewProduct({...newProduct, image_url_5: e.target.value})}
                    className="w-full rounded-lg border p-3 text-xs" 
                  />
                </div>
                <select 
                  value={newProduct.category_id} onChange={e => setNewProduct({...newProduct, category_id: parseInt(e.target.value)})}
                  className="w-full rounded-lg border p-3 text-sm"
                >
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                    <input type="checkbox" checked={newProduct.is_queridinho} onChange={e => setNewProduct({...newProduct, is_queridinho: e.target.checked})} />
                    Queridinho da Wepink
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                    <input type="checkbox" checked={newProduct.is_destaque} onChange={e => setNewProduct({...newProduct, is_destaque: e.target.checked})} />
                    Destaque do Mês
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                    <input type="checkbox" checked={newProduct.is_mais_vendido} onChange={e => setNewProduct({...newProduct, is_mais_vendido: e.target.checked})} />
                    Mais Vendido
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-[#FF0080] uppercase">
                    <input type="checkbox" checked={newProduct.is_top_bar} onChange={e => setNewProduct({...newProduct, is_top_bar: e.target.checked})} />
                    Produto da Barra Superior
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="w-full rounded-lg bg-[#FF0080] py-4 text-sm font-bold text-white uppercase tracking-widest">
                    {editingId ? "Salvar Alterações" : "Adicionar Produto"}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setNewProduct({
                          name: "", description: "", price: 0, old_price: 0, 
                          image_url: "", image_url_2: "", image_url_3: "", image_url_4: "", image_url_5: "",
                          category_id: 1,
                          is_queridinho: false, is_destaque: false, is_mais_vendido: false, is_top_bar: false
                        });
                      }}
                      className="w-full rounded-lg border border-gray-200 py-4 text-sm font-bold text-gray-400 uppercase tracking-widest hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Products List */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-4">Produto</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Preço</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={p.image_url} className="h-10 w-10 rounded object-cover" />
                          <div className="flex flex-col">
                            <span className="font-bold">{p.name}</span>
                            {p.is_top_bar === 1 && <span className="text-[8px] font-black text-[#FF0080] uppercase tracking-tighter">Barra Superior</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{p.category_name}</td>
                      <td className="px-6 py-4 font-bold text-[#FF0080]">R$ {p.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditClick(p)} className="text-gray-400 hover:text-gray-600">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="mx-auto max-w-2xl space-y-8 rounded-2xl border p-8 shadow-sm">
          <h2 className="text-xl font-black uppercase tracking-widest">Configurações Gerais</h2>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Barra Superior (Ativa?)</label>
              <select 
                value={localSettings.top_bar_active} 
                onChange={e => setLocalSettings({...localSettings, top_bar_active: e.target.value})}
                className="w-full rounded-lg border p-4 text-sm"
              >
                <option value="1">Sim</option>
                <option value="0">Não</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Texto da Barra Superior</label>
              <input 
                type="text" 
                value={localSettings.top_bar_text} 
                onChange={e => setLocalSettings({...localSettings, top_bar_text: e.target.value})}
                className="w-full rounded-lg border p-4 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">URL da Logo</label>
              <input 
                type="text" 
                value={localSettings.logo_url} 
                onChange={e => setLocalSettings({...localSettings, logo_url: e.target.value})}
                className="w-full rounded-lg border p-4 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Facebook Pixel ID</label>
                <input 
                  type="text" 
                  value={localSettings.fb_pixel_id || ""} 
                  onChange={e => setLocalSettings({...localSettings, fb_pixel_id: e.target.value})}
                  className="w-full rounded-lg border p-4 text-sm"
                  placeholder="Ex: 1234567890"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Access Token CAPI</label>
                <input 
                  type="text" 
                  value={localSettings.fb_access_token || ""} 
                  onChange={e => setLocalSettings({...localSettings, fb_access_token: e.target.value})}
                  className="w-full rounded-lg border p-4 text-sm"
                  placeholder="EAAB..."
                />
              </div>
            </div>
            <button 
              onClick={handleSaveSettings}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF0080] py-4 text-sm font-bold text-white uppercase tracking-widest"
            >
              <Save size={18} /> Salvar Alterações
            </button>
          </div>
        </div>
      )}

      {activeTab === "carousel" && (
        <div className="text-center py-20 text-gray-400">
          Funcionalidade de gerenciamento de banner em desenvolvimento...
        </div>
      )}
    </div>
  );
}
