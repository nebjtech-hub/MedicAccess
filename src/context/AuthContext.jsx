import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [medecin, setMedecin] = useState(null)
  const [chargement, setChargement] = useState(true)

  const chargerMedecin = useCallback(async (utilisateur) => {
    if (!utilisateur) {
      setMedecin(null)
      return
    }
    const { data } = await supabase.from('medecins').select('*').eq('id', utilisateur.id).maybeSingle()

    if (data) {
      setMedecin(data)
      return
    }
    // Filet de sécurité si le déclencheur d'inscription n'a pas tourné
    const { data: cree } = await supabase
      .from('medecins')
      .insert({
        id: utilisateur.id,
        nom: utilisateur.user_metadata?.nom ?? utilisateur.email?.split('@')[0] ?? 'Médecin',
        prenom: utilisateur.user_metadata?.prenom ?? '',
        email: utilisateur.email,
      })
      .select()
      .maybeSingle()
    setMedecin(cree ?? null)
  }, [])

  useEffect(() => {
    let actif = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!actif) return
      setSession(data.session)
      await chargerMedecin(data.session?.user)
      setChargement(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s)
      chargerMedecin(s?.user)
    })
    return () => {
      actif = false
      sub.subscription.unsubscribe()
    }
  }, [chargerMedecin])

  const connexion = async (email, motDePasse) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    return error?.message ?? null
  }

  const inscription = async ({ email, motDePasse, nom, prenom, specialite }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { nom, prenom, specialite } },
    })
    return error?.message ?? null
  }

  const deconnexion = async () => {
    await supabase.auth.signOut()
    setMedecin(null)
  }

  const majMedecin = async (champs) => {
    if (!medecin) return
    const { data } = await supabase.from('medecins').update(champs).eq('id', medecin.id).select().maybeSingle()
    if (data) setMedecin(data)
  }

  return (
    <AuthContext.Provider
      value={{ session, medecin, chargement, connexion, inscription, deconnexion, majMedecin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
