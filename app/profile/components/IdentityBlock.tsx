"use client";

import { useState, useRef } from "react";
import { User, Camera, Loader2, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  email?: string;
}

export default function IdentityBlock({ profile, isOwnProfile }: { profile: Profile, isOwnProfile: boolean }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [isSavingName, setIsSavingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;
      
      router.refresh();
    } catch (err) {
      console.error("Error uploading avatar:", err);
      alert("Failed to upload avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  const saveDisplayName = async () => {
    if (!displayName.trim() || displayName === profile.display_name) {
      setIsEditingName(false);
      return;
    }
    
    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', profile.id);
        
      if (error) throw error;
      router.refresh();
      setIsEditingName(false);
    } catch (err) {
      console.error("Error updating name:", err);
      alert("Failed to update name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
      <div className="relative group shrink-0">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-brand-border group-hover:border-brand-lime transition-colors bg-brand-black flex items-center justify-center">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.handle} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-brand-muted" />
          )}
        </div>
        
        {isOwnProfile && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-brand-white" /> : <Camera className="w-6 h-6 text-brand-white" />}
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>
      
      <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
        <div className="flex items-center gap-3 mb-1">
          {isEditingName && isOwnProfile ? (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-brand-black border border-brand-lime rounded-[2px] px-3 py-1 font-display text-2xl md:text-3xl font-bold text-brand-white focus:outline-none"
                autoFocus
              />
              <button 
                onClick={saveDisplayName} 
                disabled={isSavingName}
                className="p-2 bg-brand-lime text-brand-black rounded-[2px] hover:brightness-110 disabled:opacity-50"
              >
                {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              {profile.display_name}
            </h1>
          )}
          
          {isOwnProfile && !isEditingName && (
            <button 
              onClick={() => setIsEditingName(true)}
              className="text-brand-muted hover:text-brand-lime transition-colors text-sm underline decoration-dashed underline-offset-4"
            >
              edit
            </button>
          )}
        </div>
        
        <p className="font-mono text-brand-muted text-lg mb-4">@{profile.handle}</p>
        
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-muted">
          {profile.email && <div className="flex items-center gap-2"><span className="uppercase tracking-widest text-[10px] text-brand-border">Email</span> {profile.email}</div>}
          <div className="flex items-center gap-2"><span className="uppercase tracking-widest text-[10px] text-brand-border">Joined</span> {memberSince}</div>
        </div>
      </div>
    </div>
  );
}
