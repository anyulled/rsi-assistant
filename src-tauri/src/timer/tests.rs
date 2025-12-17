#[cfg(test)]
mod additional_tests {
    use super::*;

    #[test]
    fn test_reset_microbreak() {
        let mut config = BreakConfig::default();
        config.microbreak_interval = 10;
        let mut service = TimerService::new(config);

        // Accumulate active time
        for _ in 0..15 {
            service.tick(false);
        }
        assert!(service.micro_active > 10);

        service.reset_microbreak();
        assert_eq!(service.micro_active, 0);
    }

    #[test]
    fn test_reset_rest_break() {
        let mut config = BreakConfig::default();
        config.rest_interval = 20;
        let mut service = TimerService::new(config);

        for _ in 0..25 {
            service.tick(false);
        }
        assert!(service.rest_active > 20);

        service.reset_rest_break();
        assert_eq!(service.rest_active, 0);
    }

    #[test]
    fn test_update_config() {
        let mut config = BreakConfig::default();
        config.microbreak_interval = 100;
        let mut service = TimerService::new(config);

        assert_eq!(service.config.microbreak_interval, 100);

        let mut new_config = BreakConfig::default();
        new_config.microbreak_interval = 200;
        service.update_config(new_config);

        assert_eq!(service.config.microbreak_interval, 200);
    }

    #[test]
    fn test_trigger_rest_break() {
        let mut config = BreakConfig::default();
        config.rest_interval = 100;
        let mut service = TimerService::new(config);

        service.trigger_rest_break();
        assert!(service.rest_active > config.rest_interval);
    }

    #[test]
    fn test_mode_switching() {
        let config = BreakConfig::default();
        let mut service = TimerService::new(config);

        service.set_mode(OperationMode::Quiet);
        assert_eq!(service.config.mode, OperationMode::Quiet);

        service.set_mode(OperationMode::Normal);
        assert_eq!(service.config.mode, OperationMode::Normal);
    }
}
