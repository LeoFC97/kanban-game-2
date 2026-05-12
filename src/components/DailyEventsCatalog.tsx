import { useTranslation } from 'react-i18next';
import { DAILY_RANDOM_EVENT_CATALOG } from '../simulation/dailyRandomEvents';

type Props = {
  /** Sem moldura de painel (ex.: dentro de modal). */
  embedded?: boolean;
  /** Ocultar título (ex.: quando o modal já traz o cabeçalho). */
  showHeading?: boolean;
};

/** Lista estática de acontecimentos aleatórios e efeitos no jogo (referência para o jogador). */
export function DailyEventsCatalog({ embedded = false, showHeading = true }: Props) {
  const { t } = useTranslation();

  return (
    <section
      className={`daily-events-catalog ${embedded ? 'daily-events-catalog--embedded' : 'panel'}`}
    >
      {showHeading ? <h2>{t('dailyEvents.catalogTitle')}</h2> : null}
      <p className="muted catalog-intro">{t('dailyEvents.catalogIntro')}</p>
      <ul className="daily-events-list">
        {DAILY_RANDOM_EVENT_CATALOG.map((def) => (
          <li key={def.id}>
            <div className="daily-events-item-head">
              <strong>{t(`dailyEvents.${def.id}.name`)}</strong>
              <span className="muted weight">{t('dailyEvents.weightLabel', { w: def.weight })}</span>
            </div>
            <p className="daily-events-effect">{t(`dailyEvents.${def.id}.effect`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
