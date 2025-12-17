use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStats {
    pub date: String, // Format: YYYY-MM-DD
    pub total_usage_seconds: u64,

    // Microbreaks
    pub micro_prompts: u32,
    pub micro_repeated_prompts: u32,
    pub micro_prompted_taken: u32,
    pub micro_natural_taken: u32,
    pub micro_skipped: u32,
    pub micro_postponed: u32,

    // Rest Breaks
    pub rest_prompts: u32,
    pub rest_repeated_prompts: u32,
    pub rest_prompted_taken: u32,
    pub rest_natural_taken: u32,
    pub rest_skipped: u32,
    pub rest_postponed: u32,

    // Daily Limit
    pub daily_prompts: u32,
    pub daily_repeated_prompts: u32,
    pub daily_prompted_taken: u32,
    pub daily_natural_taken: u32, // Unlikely but consistent
    pub daily_skipped: u32,
    pub daily_postponed: u32,

    pub overdue_seconds: u64,
}

impl Default for DailyStats {
    fn default() -> Self {
        Self {
            date: chrono::Local::now().format("%Y-%m-%d").to_string(),
            total_usage_seconds: 0,

            micro_prompts: 0,
            micro_repeated_prompts: 0,
            micro_prompted_taken: 0,
            micro_natural_taken: 0,
            micro_skipped: 0,
            micro_postponed: 0,

            rest_prompts: 0,
            rest_repeated_prompts: 0,
            rest_prompted_taken: 0,
            rest_natural_taken: 0,
            rest_skipped: 0,
            rest_postponed: 0,

            daily_prompts: 0,
            daily_repeated_prompts: 0,
            daily_prompted_taken: 0,
            daily_natural_taken: 0,
            daily_skipped: 0,
            daily_postponed: 0,

            overdue_seconds: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StatsStore {
    pub stats: HashMap<String, DailyStats>, // Key: date (YYYY-MM-DD)
}

impl StatsStore {
    pub fn get_or_create_today(&mut self) -> &mut DailyStats {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        self.stats
            .entry(today.clone())
            .or_insert_with(|| DailyStats { date: today, ..Default::default() })
    }

    pub fn get_last_n_days(&self, n: usize) -> Vec<DailyStats> {
        let mut dates: Vec<_> = self.stats.keys().collect();
        dates.sort_by(|a, b| b.cmp(a)); // Sort descending (newest first)
        dates.into_iter().take(n).filter_map(|date| self.stats.get(date).cloned()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_daily_stats_default() {
        let stats = DailyStats::default();
        assert_eq!(stats.total_usage_seconds, 0);
        assert_eq!(stats.micro_prompted_taken, 0);
        assert_eq!(stats.rest_prompted_taken, 0);
    }

    #[test]
    fn test_stats_store_get_or_create_today() {
        let mut store = StatsStore::default();
        let today = store.get_or_create_today();

        assert_eq!(today.total_usage_seconds, 0);

        today.micro_prompted_taken = 5;

        let today_again = store.get_or_create_today();
        assert_eq!(today_again.micro_prompted_taken, 5);
    }

    #[test]
    fn test_stats_store_get_last_n_days() {
        let mut store = StatsStore::default();

        let mut stats1 = DailyStats::default();
        stats1.date = "2024-01-01".to_string();
        stats1.total_usage_seconds = 1000;
        stats1.micro_prompted_taken = 1;

        store.stats.insert("2024-01-01".to_string(), stats1);

        let mut stats2 = DailyStats::default();
        stats2.date = "2024-01-02".to_string();
        stats2.total_usage_seconds = 2000;
        stats2.micro_prompted_taken = 2;
        stats2.micro_postponed = 1;
        stats2.rest_prompted_taken = 1;

        store.stats.insert("2024-01-02".to_string(), stats2);

        let last_2 = store.get_last_n_days(2);
        assert_eq!(last_2.len(), 2);
        assert_eq!(last_2[0].date, "2024-01-02"); // Newest first
        assert_eq!(last_2[1].date, "2024-01-01");
    }

    #[test]
    fn test_stats_store_get_last_n_days_limited() {
        let mut store = StatsStore::default();

        for i in 1..=10 {
            let mut stats = DailyStats::default();
            stats.date = format!("2024-01-{:02}", i);
            stats.total_usage_seconds = i * 1000;
            stats.micro_prompted_taken = i as u32;

            store.stats.insert(stats.date.clone(), stats);
        }

        let last_5 = store.get_last_n_days(5);
        assert_eq!(last_5.len(), 5);
    }
}
