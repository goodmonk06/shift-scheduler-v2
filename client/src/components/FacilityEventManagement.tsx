import { useState, useEffect } from "react";
import { Calendar, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { facilityEventService, type FacilityEvent } from "../services/facilityEventService";
import { useToast } from "../hooks/useToast";

interface EventFormData {
  year: number;
  month: number;
  day: number;
  title: string;
  description: string;
  time: string;
}

export function FacilityEventManagement() {
  const toast = useToast();
  const [events, setEvents] = useState<FacilityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState<EventFormData>({
    year: currentYear,
    month: currentMonth,
    day: 1,
    title: "",
    description: "",
    time: "",
  });

  // イベント一覧を取得
  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const data = await facilityEventService.getAllEvents();
      setEvents(data);
    } catch (error) {
      console.error("Failed to load events:", error);
      toast.error("イベントの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // フォームリセット
  const resetForm = () => {
    setFormData({
      year: currentYear,
      month: currentMonth,
      day: 1,
      title: "",
      description: "",
      time: "",
    });
    setIsCreating(false);
    setEditingId(null);
  };

  // イベント作成
  const handleCreate = async () => {
    if (!formData.title) {
      toast.error("イベント名を入力してください");
      return;
    }

    try {
      await facilityEventService.createEvent({
        year: formData.year,
        month: formData.month,
        day: formData.day,
        title: formData.title,
        description: formData.description || undefined,
        time: formData.time || undefined,
      });
      toast.success("イベントを作成しました");
      resetForm();
      await loadEvents();
    } catch (error) {
      console.error("Failed to create event:", error);
      toast.error("イベントの作成に失敗しました");
    }
  };

  // イベント更新
  const handleUpdate = async () => {
    if (!editingId || !formData.title) return;

    try {
      await facilityEventService.updateEvent(editingId, {
        year: formData.year,
        month: formData.month,
        day: formData.day,
        title: formData.title,
        description: formData.description || undefined,
        time: formData.time || undefined,
      });
      toast.success("イベントを更新しました");
      resetForm();
      await loadEvents();
    } catch (error) {
      console.error("Failed to update event:", error);
      toast.error("イベントの更新に失敗しました");
    }
  };

  // イベント削除
  const handleDelete = async (id: number) => {
    if (!confirm("このイベントを削除してもよろしいですか？")) return;

    try {
      await facilityEventService.deleteEvent(id);
      toast.success("イベントを削除しました");
      await loadEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("イベントの削除に失敗しました");
    }
  };

  // 編集開始
  const startEdit = (event: FacilityEvent) => {
    setEditingId(event.id);
    setFormData({
      year: event.year,
      month: event.month,
      day: event.day,
      title: event.title,
      description: event.description || "",
      time: event.time || "",
    });
    setIsCreating(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">施設イベント管理</h1>
            <p className="text-sm text-muted-foreground">
              全職員のホーム画面に表示されるイベントを設定
            </p>
          </div>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新規イベント
          </Button>
        )}
      </div>

      {/* 作成・編集フォーム */}
      {isCreating && (
        <Card className="p-6 rounded-2xl">
          <h3 className="text-lg mb-4 text-gray-900">
            {editingId ? "イベントを編集" : "新規イベントを作成"}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">年</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  min={2024}
                  max={2030}
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">月</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">日</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: parseInt(e.target.value) })}
                  min={1}
                  max={31}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-700">イベント名 *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例: 全体会議"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-700">時間（オプション）</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                placeholder="例: 10:00 - 11:30"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-700">説明（オプション）</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例: 月次全体会議を開催します"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={editingId ? handleUpdate : handleCreate}>
                <Save className="w-4 h-4 mr-2" />
                {editingId ? "更新" : "作成"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* イベント一覧 */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg text-gray-900">登録イベント一覧</h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              読み込み中...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p>イベントが登録されていません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm text-muted-foreground">
                        {event.year}年{event.month}月{event.day}日
                      </span>
                      {event.time && (
                        <span className="text-sm text-muted-foreground">
                          {event.time}
                        </span>
                      )}
                    </div>
                    <h4 className="text-gray-900">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(event)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
