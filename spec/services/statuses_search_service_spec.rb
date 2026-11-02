# frozen_string_literal: true

require 'rails_helper'

RSpec.describe StatusesSearchService do
  describe '#call' do
    let!(:status) { Fabricate(:status, text: 'status number one') }
    let(:results) { subject.call('one', status.account, limit: 5) }

    before { Fabricate(:status, text: 'status number two') }

    context 'when elasticsearch is enabled', :search do
      it 'runs a search for statuses' do
        expect(results)
          .to have_attributes(
            size: 1,
            first: eq(status)
          )
      end
    end
  end

  describe '#more_results?', :search do
    let(:account) { Fabricate(:account) }
    let(:author) { Fabricate(:account, indexable: true) }
    let(:muted) { Fabricate(:account, indexable: true) }
    let!(:older_statuses) { Fabricate.times(2, :status, account: author, text: 'zebrafish') }

    before do
      Fabricate(:status, account: muted, text: 'zebrafish')
      account.mute!(muted)
    end

    it 'reports more results when filtering made the page short' do
      results = subject.call('zebrafish', account, limit: 2)

      expect(results).to eq [older_statuses.last]
      expect(subject.more_results?).to be true
    end

    it 'reports no more results on the last page' do
      results = subject.call('zebrafish', account, limit: 2, offset: 2)

      expect(results).to eq [older_statuses.first]
      expect(subject.more_results?).to be false
    end
  end
end
