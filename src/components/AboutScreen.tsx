import { useTranslation } from 'react-i18next';

type Props = {
  onClose: () => void;
};

function MathBlock({ children }: { children: string }) {
  return <pre className="about-math" role="img" aria-label={children}>{children}</pre>;
}

export function AboutScreen({ onClose }: Props) {
  const { t } = useTranslation();

  return (
    <article className="about-screen setup-screen">
      <header className="page-header about-header">
        <h1>{t('about.title')}</h1>
        <p className="lede">{t('about.lede')}</p>
      </header>

      <section className="about-section">
        <h2>{t('about.sections.points.title')}</h2>
        <p className="muted">{t('about.sections.points.body')}</p>
        <MathBlock>{t('about.sections.points.formula')}</MathBlock>
      </section>

      <section className="about-section">
        <h2>{t('about.sections.dailyCapacity.title')}</h2>
        <p className="muted">{t('about.sections.dailyCapacity.body')}</p>
        <MathBlock>{t('about.sections.dailyCapacity.formula1')}</MathBlock>
        <MathBlock>{t('about.sections.dailyCapacity.formula2')}</MathBlock>
        <MathBlock>{t('about.sections.dailyCapacity.formula3')}</MathBlock>
        <MathBlock>{t('about.sections.dailyCapacity.formula4')}</MathBlock>
      </section>

      <section className="about-section">
        <h2>{t('about.sections.teamDaily.title')}</h2>
        <p className="muted">{t('about.sections.teamDaily.body')}</p>
        <MathBlock>{t('about.sections.teamDaily.formula1')}</MathBlock>
        <MathBlock>{t('about.sections.teamDaily.formula2')}</MathBlock>
      </section>

      <section className="about-section">
        <h2>{t('about.sections.devSpend.title')}</h2>
        <p className="muted">{t('about.sections.devSpend.body')}</p>
        <MathBlock>{t('about.sections.devSpend.formula1')}</MathBlock>
        <MathBlock>{t('about.sections.devSpend.formula2')}</MathBlock>
      </section>

      <section className="about-section">
        <h2>{t('about.sections.synergy.title')}</h2>
        <p className="muted">{t('about.sections.synergy.body')}</p>
        <MathBlock>{t('about.sections.synergy.formula1')}</MathBlock>
        <MathBlock>{t('about.sections.synergy.formula2')}</MathBlock>
        <MathBlock>{t('about.sections.synergy.formula3')}</MathBlock>
      </section>

      <section className="about-section">
        <h2>{t('about.sections.handoff.title')}</h2>
        <p className="muted">{t('about.sections.handoff.body')}</p>
        <MathBlock>{t('about.sections.handoff.formula1')}</MathBlock>
        <MathBlock>{t('about.sections.handoff.formula2')}</MathBlock>
        <MathBlock>{t('about.sections.handoff.formula3')}</MathBlock>
        <MathBlock>{t('about.sections.handoff.formula4')}</MathBlock>
      </section>

      <section className="about-section">
        <h2>{t('about.sections.wip.title')}</h2>
        <p className="muted">{t('about.sections.wip.body')}</p>
        <MathBlock>{t('about.sections.wip.formula')}</MathBlock>
      </section>

      <section className="about-section">
        <h2>{t('about.sections.dailyEvents.title')}</h2>
        <p className="muted">{t('about.sections.dailyEvents.body')}</p>
        <MathBlock>{t('about.sections.dailyEvents.formula1')}</MathBlock>
        <MathBlock>{t('about.sections.dailyEvents.formula2')}</MathBlock>
      </section>

      <section className="about-section">
        <h2>{t('about.sections.symbols.title')}</h2>
        <p className="muted">{t('about.sections.symbols.body')}</p>
      </section>

      <footer className="about-footer">
        <button type="button" className="btn primary" onClick={onClose}>
          {t('about.close')}
        </button>
      </footer>
    </article>
  );
}
