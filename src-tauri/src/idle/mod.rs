use device_query::{DeviceQuery, DeviceState};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub trait IdleDetector: Send + Sync {
    fn get_seconds_since_last_input(&self) -> u64;
}

pub struct DeviceQueryIdleDetector {
    last_activity: Arc<Mutex<u64>>,
    // We keep the thread handle to ensure it lives as long as the struct
    _polling_thread: Option<thread::JoinHandle<()>>,
}

impl DeviceQueryIdleDetector {
    pub fn new() -> Self {
        let last_activity = Arc::new(Mutex::new(Self::now()));
        let last_activity_clone = last_activity.clone();

        let thread_handle = thread::spawn(move || {
            let device_state = DeviceState::new();
            let mut last_mouse_pos = device_state.get_mouse().coords;

            loop {
                thread::sleep(Duration::from_millis(100));

                let mouse = device_state.get_mouse();
                let keys = device_state.get_keys();

                if mouse.coords != last_mouse_pos || !keys.is_empty() {
                    let mut guard = last_activity_clone.lock().unwrap();
                    *guard = Self::now();
                    last_mouse_pos = mouse.coords;
                }
            }
        });

        Self {
            last_activity,
            _polling_thread: Some(thread_handle),
        }
    }

    fn now() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
}

impl IdleDetector for DeviceQueryIdleDetector {
    fn get_seconds_since_last_input(&self) -> u64 {
        let last = *self.last_activity.lock().unwrap();
        Self::now().saturating_sub(last)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockIdleDetector {
        last_input_secs_ago: u64,
    }

    impl IdleDetector for MockIdleDetector {
        fn get_seconds_since_last_input(&self) -> u64 {
            self.last_input_secs_ago
        }
    }

    #[test]
    fn test_mock_implementation() {
        let mock = MockIdleDetector {
            last_input_secs_ago: 100,
        };
        assert_eq!(mock.get_seconds_since_last_input(), 100);
    }

    #[test]
    fn test_device_query_init() {
        let detector = DeviceQueryIdleDetector::new();
        let idle = detector.get_seconds_since_last_input();
        // Just verify it doesn't panic and returns a sane value
        assert!(idle < 1000);
    }
}
