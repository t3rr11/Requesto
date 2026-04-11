import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Dialog } from '../components/Dialog';
import { Button } from '../components/Button';
import type { OAuthConfig } from '../store/oauth/types';
import {
  substituteUrlPlaceholders,
  extractUrlPlaceholders,
  getProviderTemplate,
  type OAuthProviderTemplate,
} from '../helpers/oauth/providers';
import {
  oauthConfigFormSchema,
  oauthConfigSchema,
  CREATE_STEP_FIELDS,
  EDIT_STEP_FIELDS,
  type OAuthConfigFormData,
} from './schemas/oauthSchema';
import { ProviderStep } from './oauth-steps/ProviderStep';
import { CredentialsStep } from './oauth-steps/CredentialsStep';
import { ConfigureStep } from './oauth-steps/ConfigureStep';
import { ReviewStep } from './oauth-steps/ReviewStep';

type FormMode = 'guided' | 'advanced';

interface OAuthConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'> & { clientSecret?: string }) => Promise<void>;
  onDelete?: (configId: string) => Promise<void>;
  editConfig?: OAuthConfig;
}

const CREATE_STEPS = ['Provider', 'Credentials', 'Configure', 'Review'] as const;
const EDIT_STEPS = ['Credentials', 'Configure', 'Review'] as const;

const DEFAULT_VALUES: OAuthConfigFormData = {
  name: '',
  provider: '',
  authorizationUrl: '',
  tokenUrl: '',
  revocationUrl: '',
  clientId: '',
  clientSecret: '',
  flowType: 'authorization-code-pkce',
  usePKCE: true,
  scopes: '',
  redirectUri: '',
  tokenStorage: 'session',
  usePopup: true,
  autoRefreshToken: true,
  tokenRefreshThreshold: 300,
};

function getDefaultValues(editConfig?: OAuthConfig): OAuthConfigFormData {
  if (!editConfig) return DEFAULT_VALUES;
  return {
    name: editConfig.name,
    provider: editConfig.provider,
    authorizationUrl: editConfig.authorizationUrl,
    tokenUrl: editConfig.tokenUrl,
    revocationUrl: editConfig.revocationUrl ?? '',
    clientId: editConfig.clientId,
    clientSecret: '',
    flowType: editConfig.flowType,
    usePKCE: editConfig.usePKCE,
    scopes: editConfig.scopes.join(' '),
    redirectUri: editConfig.redirectUri ?? '',
    tokenStorage: editConfig.tokenStorage,
    usePopup: editConfig.usePopup,
    autoRefreshToken: editConfig.autoRefreshToken,
    tokenRefreshThreshold: editConfig.tokenRefreshThreshold,
  };
}

export function OAuthConfigForm({ isOpen, onClose, onSave, onDelete, editConfig }: OAuthConfigFormProps) {
  const [mode, setMode] = useState<FormMode>('guided');
  const [step, setStep] = useState(0);
  const isEditing = !!editConfig;
  const steps = isEditing ? EDIT_STEPS : CREATE_STEPS;
  const stepFields = isEditing ? EDIT_STEP_FIELDS : CREATE_STEP_FIELDS;
  const [template, setTemplate] = useState<OAuthProviderTemplate | null>(null);
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const methods = useForm<OAuthConfigFormData>({
    resolver: zodResolver(oauthConfigFormSchema),
    defaultValues: getDefaultValues(editConfig),
    mode: 'onTouched',
  });

  const { handleSubmit, trigger, reset, formState: { isSubmitting } } = methods;

  // Reset form state when the dialog opens (keyed on editConfig.id, not object reference)
  const editConfigId = editConfig?.id;
  useEffect(() => {
    if (!isOpen) return;
    const values = getDefaultValues(editConfig);
    reset(values);
    setStep(0);
    setSubmitError('');

    if (editConfig && editConfig.provider && editConfig.provider !== 'custom') {
      const t = getProviderTemplate(editConfig.provider);
      setTemplate(t);
      if (t) {
        const authP = extractUrlPlaceholders(t.authorizationUrl);
        const tokenP = extractUrlPlaceholders(t.tokenUrl);
        const all = [...new Set([...authP, ...tokenP])];
        const filled: Record<string, string> = {};
        // Try to extract placeholder values from the saved URLs
        all.forEach(p => {
          const pattern = `{${p}}`;
          const templateAuth = t.authorizationUrl;
          const idx = templateAuth.indexOf(pattern);
          if (idx !== -1) {
            // Extract the value at that position from the saved URL
            const before = templateAuth.substring(0, idx);
            const after = templateAuth.substring(idx + pattern.length);
            const savedUrl = editConfig.authorizationUrl;
            const startPos = savedUrl.indexOf(before) + before.length;
            const endPos = after ? savedUrl.indexOf(after, startPos) : savedUrl.length;
            if (startPos >= 0 && endPos > startPos) {
              filled[p] = savedUrl.substring(startPos, endPos);
            }
          }
          if (!filled[p]) filled[p] = '';
        });
        setPlaceholders(filled);
      } else {
        setPlaceholders({});
      }
    } else {
      setTemplate(null);
      setPlaceholders({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editConfigId]);

  const handleSelectTemplate = (t: OAuthProviderTemplate | null) => {
    setTemplate(t);
    if (t) {
      const authPlaceholders = extractUrlPlaceholders(t.authorizationUrl);
      const tokenPlaceholders = extractUrlPlaceholders(t.tokenUrl);
      const all = [...new Set([...authPlaceholders, ...tokenPlaceholders])];
      const fresh: Record<string, string> = {};
      all.forEach(p => { fresh[p] = ''; });
      setPlaceholders(fresh);
    } else {
      setPlaceholders({});
    }
  };

  const validatePlaceholders = (): boolean => {
    const missing = Object.entries(placeholders).filter(([, v]) => !v.trim());
    if (missing.length > 0) {
      setSubmitError(`Please fill in: ${missing.map(([k]) => k).join(', ')}`);
      return false;
    }
    return true;
  };

  const credentialsStepIndex = isEditing ? 0 : 1;

  const handleNext = async () => {
    setSubmitError('');
    const fields = stepFields[step];
    if (fields && fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    if (step === credentialsStepIndex && Object.keys(placeholders).length > 0 && !validatePlaceholders()) return;
    setStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setSubmitError('');
    setStep(prev => Math.max(prev - 1, 0));
  };

  const buildConfig = (data: OAuthConfigFormData): Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'> & { clientSecret?: string } => {
    let authUrl = data.authorizationUrl;
    let tokenUrl = data.tokenUrl;
    let revUrl = data.revocationUrl ?? '';

    if (Object.keys(placeholders).length > 0) {
      authUrl = substituteUrlPlaceholders(authUrl, placeholders);
      tokenUrl = substituteUrlPlaceholders(tokenUrl, placeholders);
      if (revUrl) revUrl = substituteUrlPlaceholders(revUrl, placeholders);
    }

    return {
      name: data.name.trim(),
      provider: data.provider,
      authorizationUrl: authUrl,
      tokenUrl: tokenUrl,
      revocationUrl: revUrl || undefined,
      clientId: data.clientId.trim(),
      clientSecret: data.clientSecret?.trim() || undefined,
      flowType: data.flowType,
      usePKCE: data.usePKCE,
      scopes: data.scopes.split(/\s+/).filter(s => s.length > 0),
      redirectUri: data.redirectUri?.trim() || undefined,
      tokenStorage: data.tokenStorage,
      usePopup: data.usePopup,
      autoRefreshToken: data.autoRefreshToken,
      tokenRefreshThreshold: data.tokenRefreshThreshold,
      additionalParams: template?.additionalParams,
    };
  };

  const onSubmit = async (data: OAuthConfigFormData) => {
    // Guard: only allow submission on the final step in guided mode
    if (mode === 'guided' && step < steps.length - 1) return;

    setSubmitError('');

    if (Object.keys(placeholders).length > 0 && !validatePlaceholders()) return;

    const config = buildConfig(data);

    const urlValidation = oauthConfigSchema.safeParse({
      ...data,
      authorizationUrl: config.authorizationUrl,
      tokenUrl: config.tokenUrl,
      revocationUrl: config.revocationUrl ?? '',
    });

    if (!urlValidation.success) {
      setSubmitError(urlValidation.error.issues[0]?.message ?? 'Validation failed');
      return;
    }

    try {
      await onSave(config);
      handleClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const handleClose = () => {
    reset(DEFAULT_VALUES);
    setStep(0);
    setMode('guided');
    setTemplate(null);
    setPlaceholders({});
    setSubmitError('');
    onClose();
  };

  const handleDelete = async () => {
    if (!editConfig || !onDelete) return;
    if (!confirm('Are you sure you want to delete this OAuth configuration? This cannot be undone.')) return;
    try {
      await onDelete(editConfig.id);
      handleClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  const handleModeSwitch = () => {
    setSubmitError('');
    setMode(prev => (prev === 'guided' ? 'advanced' : 'guided'));
    setStep(0);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={editConfig ? 'Edit OAuth Configuration' : 'New OAuth Configuration'}
      size="xl"
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          {/* Mode toggle + step indicator */}
          <div className="flex items-center justify-between mb-4">
            {mode === 'guided' ? (
              <StepIndicator steps={steps} currentStep={step} />
            ) : (
              <div />
            )}
            <ModeToggle mode={mode} onSwitch={handleModeSwitch} />
          </div>

          {submitError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm mb-4">
              {submitError}
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-72">
            {mode === 'guided' ? (
              <GuidedContent
                step={step}
                template={template}
                placeholders={placeholders}
                onSelectTemplate={handleSelectTemplate}
                onPlaceholderChange={setPlaceholders}
                isEditing={isEditing}
              />
            ) : (
              <AdvancedContent
                template={template}
                placeholders={placeholders}
                onSelectTemplate={handleSelectTemplate}
                onPlaceholderChange={setPlaceholders}
                isEditing={isEditing}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <div className="flex gap-2">
              <Button type="button" onClick={handleClose} variant="secondary" disabled={isSubmitting}>
                Cancel
              </Button>
              {editConfig && onDelete && (
                <Button type="button" onClick={handleDelete} variant="danger" disabled={isSubmitting}>
                  Delete
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {mode === 'guided' && step > 0 && (
                <Button type="button" onClick={handleBack} variant="secondary" disabled={isSubmitting}>
                  <ChevronLeft size={16} />
                  Back
                </Button>
              )}
              {mode === 'guided' && step < steps.length - 1 ? (
                <Button key="next" type="button" onClick={handleNext} variant="primary">
                  Next
                  <ChevronRight size={16} />
                </Button>
              ) : (
                <Button key="submit" type="submit" disabled={isSubmitting} variant="primary">
                  {isSubmitting ? 'Saving...' : editConfig ? 'Save Changes' : 'Create Configuration'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </FormProvider>
    </Dialog>
  );
}

/* ---------- Sub-components ---------- */

function ModeToggle({ mode, onSwitch }: { mode: FormMode; onSwitch: () => void }) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 shrink-0">
      <button
        type="button"
        onClick={mode !== 'guided' ? onSwitch : undefined}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          mode === 'guided'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        Guided
      </button>
      <button
        type="button"
        onClick={mode !== 'advanced' ? onSwitch : undefined}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          mode === 'advanced'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        Advanced
      </button>
    </div>
  );
}

function StepIndicator({ steps, currentStep }: { steps: readonly string[]; currentStep: number }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
            i === currentStep
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : i < currentStep
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-400 dark:text-gray-500'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              i < currentStep
                ? 'bg-green-500 text-white'
                : i === currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {i < currentStep ? '\u2713' : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-4 h-px ${i < currentStep ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

interface ContentProps {
  template: OAuthProviderTemplate | null;
  placeholders: Record<string, string>;
  onSelectTemplate: (t: OAuthProviderTemplate | null) => void;
  onPlaceholderChange: (p: Record<string, string>) => void;
}

function GuidedContent({ step, isEditing, ...props }: ContentProps & { step: number; isEditing: boolean }) {
  // Edit mode skips provider step: 0=Credentials, 1=Configure, 2=Review
  // Create mode: 0=Provider, 1=Credentials, 2=Configure, 3=Review
  if (isEditing) {
    switch (step) {
      case 0:
        return (
          <CredentialsStep
            template={props.template}
            placeholders={props.placeholders}
            onPlaceholderChange={props.onPlaceholderChange}
          />
        );
      case 1:
        return <ConfigureStep template={props.template} />;
      case 2:
        return <ReviewStep template={props.template} />;
      default:
        return null;
    }
  }

  switch (step) {
    case 0:
      return <ProviderStep onSelectTemplate={props.onSelectTemplate} />;
    case 1:
      return (
        <CredentialsStep
          template={props.template}
          placeholders={props.placeholders}
          onPlaceholderChange={props.onPlaceholderChange}
        />
      );
    case 2:
      return <ConfigureStep template={props.template} />;
    case 3:
      return <ReviewStep template={props.template} />;
    default:
      return null;
  }
}

function AdvancedContent({ isEditing, ...props }: ContentProps & { isEditing: boolean }) {
  return (
    <div className="space-y-6">
      {!isEditing && (
        <Section title="Provider">
          <ProviderStep onSelectTemplate={props.onSelectTemplate} />
        </Section>
      )}
      <Section title="Credentials">
        <CredentialsStep
          template={props.template}
          placeholders={props.placeholders}
          onPlaceholderChange={props.onPlaceholderChange}
        />
      </Section>
      <Section title="Configuration">
        <ConfigureStep template={props.template} />
      </Section>
      <Section title="Token & Preferences">
        <ReviewStep template={props.template} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">
        {title}
      </h3>
      {children}
    </div>
  );
}
