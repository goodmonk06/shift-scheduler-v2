import { Calendar, Clock, Check, X, Sparkles } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  WorkPreference,
  getPreferenceTypeLabel,
  getPreferenceIcon,
  getPreferenceColor
} from "../services/workPreferenceService";

interface WorkPreferenceCardProps {
  preferences: WorkPreference[];
  employeeName: string;
  employeeId: number;
  onClick: (employeeId: number) => void;
}

export function WorkPreferenceCard({ preferences, employeeName, employeeId, onClick }: WorkPreferenceCardProps) {
  const statusConfig = {
    pending: { label: "*", color: "bg-warning", icon: Clock },
    approved: { label: "", color: "bg-success", icon: Check },
    rejected: { label: "t", color: "bg-destructive", icon: X },
  };

  // Get the overall status (if any preference is pending, show pending)
  const overallStatus = preferences.some(p => p.status === "pending")
    ? "pending"
    : preferences.some(p => p.status === "rejected")
      ? "rejected"
      : "approved";

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  return (
    <Card
      className="p-5 hover:shadow-lg transition-all cursor-pointer border-2"
      onClick={() => onClick(employeeId)}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <AvatarFallback className="text-blue-600">
                {employeeName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4>{employeeName}</h4>
              <p className="text-muted-foreground">äÙ</p>
            </div>
          </div>
          <Badge className={`${config.color} flex items-center gap-1`}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>

        {/* Preference Summary */}
        <div className="flex flex-wrap gap-2">
          {preferences.slice(0, 3).map((pref, index) => {
            const icon = getPreferenceIcon(pref.preferenceType, pref.displayIcon);
            const colorClass = getPreferenceColor(pref.preferenceType);
            const label = getPreferenceTypeLabel(pref.preferenceType);
            const date = new Date(pref.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

            return (
              <Badge
                key={index}
                variant="outline"
                className={`${colorClass} border-2`}
              >
                <span className="mr-1">{icon}</span>
                {dateStr} {label}
                {pref.startTime && pref.endTime && ` ${pref.startTime}~${pref.endTime}`}
              </Badge>
            );
          })}
          {preferences.length > 3 && (
            <Badge variant="outline" className="border-2">
              Ö {preferences.length - 3}ö
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {preferences.length > 0 && preferences[0].submittedAt
              ? new Date(preferences[0].submittedAt).toLocaleDateString('ja-JP')
              : '*{2'}
          </span>
          <span className="flex items-center gap-1 text-blue-600">
            <Sparkles className="w-4 h-4" />
            {preferences.length}önäÙ
          </span>
        </div>
      </div>
    </Card>
  );
}