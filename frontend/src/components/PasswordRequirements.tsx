import { Check } from 'lucide-react'

export interface PasswordValidation {
  meetsLength: boolean
  meetsUpper: boolean
  meetsNumber: boolean
  meetsSpecial: boolean
  allValid: boolean
}

export function validatePassword(password: string): PasswordValidation {
  const meetsLength = password.length >= 8
  const meetsUpper = /[A-Z]/.test(password)
  const meetsNumber = /[0-9]/.test(password)
  const meetsSpecial = /[@$!%*#?&]/.test(password)
  return {
    meetsLength,
    meetsUpper,
    meetsNumber,
    meetsSpecial,
    allValid: meetsLength && meetsUpper && meetsNumber && meetsSpecial,
  }
}

export function isInstitutionalEmail(email: string): boolean {
  return /@ucundinamarca\.edu\.co$/i.test(email.trim())
}

export function PasswordRequirements({ password }: { password: string }) {
  const { meetsLength, meetsUpper, meetsNumber, meetsSpecial } = validatePassword(password)

  const items = [
    { id: 'len', label: 'Longitud mínima de 8 caracteres', valid: meetsLength },
    { id: 'upper', label: 'Al menos una letra mayúscula', valid: meetsUpper },
    { id: 'num', label: 'Al menos un dígito numérico', valid: meetsNumber },
    { id: 'spec', label: 'Al menos un carácter especial (@, $, !, %, *, #, ?, &)', valid: meetsSpecial },
  ]

  return (
    <div className="rounded-lg border border-line bg-paper/60 p-3 space-y-2 text-xs">
      <p className="font-semibold text-ink/70">Requisitos de seguridad</p>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li
            key={it.id}
            className={`flex items-center gap-2 transition-colors ${
              it.valid ? 'text-emerald-700 font-medium' : 'text-ink/40'
            }`}
          >
            {it.valid ? (
              <Check size={14} className="text-emerald-600 shrink-0" />
            ) : (
              <span className="h-3.5 w-3.5 rounded-full border border-ink/30 shrink-0 flex items-center justify-center text-[10px]" />
            )}
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
